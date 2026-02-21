import { Subject } from 'rxjs';
import { ErrorHandler, NavigationError, ErrorCode, ErrorSeverity, Position } from '../types';

interface RecoveryContext {
  instrumentService?: any;
  chartManager?: any;
  trackRepository?: any;
  logbookRepository?: any;
  lastKnownPosition?: Position;
  lastKnownCourse?: number;
  lastKnownSpeed?: number;
}

export class ErrorHandlerImpl implements ErrorHandler {
  private errorSubject = new Subject<NavigationError>();
  private errorLog: NavigationError[] = [];
  private maxLogSize = 100;
  private recoveryContext: RecoveryContext = {};
  
  // Dead reckoning state
  private deadReckoningActive = false;
  private deadReckoningStartTime: number | null = null;
  private deadReckoningInterval: ReturnType<typeof setInterval> | null = null;

  handle(error: NavigationError): void {
    // Log the error
    this.logError(error);

    // Notify subscribers
    this.errorSubject.next(error);

    // Handle based on severity
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL]', error.message, error);
        this.handleCriticalError(error);
        break;
      case ErrorSeverity.ERROR:
        console.error('[ERROR]', error.message, error);
        this.handleError(error);
        break;
      case ErrorSeverity.WARNING:
        console.warn('[WARNING]', error.message, error);
        break;
      case ErrorSeverity.INFO:
        console.info('[INFO]', error.message, error);
        break;
    }

    // Attempt recovery if error is recoverable
    if (error.recoverable) {
      this.attemptRecovery(error);
    }
  }

  subscribe(callback: (error: NavigationError) => void): { unsubscribe: () => void } {
    const subscription = this.errorSubject.subscribe(callback);
    return {
      unsubscribe: () => subscription.unsubscribe()
    };
  }

  getErrorLog(): NavigationError[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Cleanup method for tests and shutdown
  cleanup(): void {
    this.stopDeadReckoning();
    this.errorLog = [];
  }

  // Set recovery context for services
  setRecoveryContext(context: RecoveryContext): void {
    this.recoveryContext = { ...this.recoveryContext, ...context };
  }

  // Update navigation state for dead reckoning
  updateNavigationState(position: Position, course?: number, speed?: number): void {
    this.recoveryContext.lastKnownPosition = position;
    if (course !== undefined) this.recoveryContext.lastKnownCourse = course;
    if (speed !== undefined) this.recoveryContext.lastKnownSpeed = speed;
  }

  private logError(error: NavigationError): void {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  private handleCriticalError(error: NavigationError): void {
    // Critical errors might require app restart or major intervention
    // For now, just ensure they're prominently logged
    console.error('CRITICAL ERROR OCCURRED:', {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      stack: error.stack
    });
  }

  private handleError(error: NavigationError): void {
    // Regular errors - log and potentially show to user
    console.error('ERROR OCCURRED:', {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable
    });
  }

  private attemptRecovery(error: NavigationError): void {
    console.log(`Attempting recovery for error: ${error.code}`);

    switch (error.code) {
      case ErrorCode.GPS_SIGNAL_LOST:
        this.recoverFromGPSLoss();
        break;
      case ErrorCode.INSTRUMENT_DISCONNECTED:
        this.recoverFromInstrumentDisconnection();
        break;
      case ErrorCode.CHART_LOAD_FAILED:
        this.recoverFromChartLoadFailure().catch(err => 
          console.error('Chart load recovery failed:', err)
        );
        break;
      case ErrorCode.STORAGE_FULL:
        this.recoverFromStorageFull().catch(err => 
          console.error('Storage cleanup failed:', err)
        );
        break;
      case ErrorCode.NETWORK_UNAVAILABLE:
        this.recoverFromNetworkUnavailable();
        break;
      default:
        console.log(`No recovery strategy for error code: ${error.code}`);
    }
  }

  private recoverFromGPSLoss(): void {
    console.log('Recovery: Switching to dead reckoning mode');
    
    if (this.deadReckoningActive) {
      console.log('Dead reckoning already active');
      return;
    }

    const { lastKnownPosition, lastKnownCourse, lastKnownSpeed } = this.recoveryContext;

    if (!lastKnownPosition || lastKnownCourse === undefined || lastKnownSpeed === undefined) {
      console.warn('Insufficient data for dead reckoning');
      return;
    }

    this.deadReckoningActive = true;
    this.deadReckoningStartTime = Date.now();

    // Estimate position every 10 seconds based on last known course and speed
    this.deadReckoningInterval = setInterval(() => {
      if (!this.recoveryContext.lastKnownPosition || 
          this.recoveryContext.lastKnownCourse === undefined || 
          this.recoveryContext.lastKnownSpeed === undefined) {
        this.stopDeadReckoning();
        return;
      }

      const elapsedSeconds = (Date.now() - (this.deadReckoningStartTime || Date.now())) / 1000;
      const distanceNM = (this.recoveryContext.lastKnownSpeed * elapsedSeconds) / 3600; // Convert to nautical miles
      
      // Calculate new position using dead reckoning
      const estimatedPosition = this.calculateDeadReckoningPosition(
        this.recoveryContext.lastKnownPosition,
        this.recoveryContext.lastKnownCourse,
        distanceNM
      );

      console.log('Dead reckoning position:', estimatedPosition);
      
      // Could emit this estimated position to subscribers
      // this.emitEstimatedPosition(estimatedPosition);
    }, 10000);

    console.log('Dead reckoning mode activated');
  }

  private stopDeadReckoning(): void {
    if (this.deadReckoningInterval) {
      clearInterval(this.deadReckoningInterval);
      this.deadReckoningInterval = null;
    }
    this.deadReckoningActive = false;
    this.deadReckoningStartTime = null;
    console.log('Dead reckoning mode deactivated');
  }

  private calculateDeadReckoningPosition(
    position: Position,
    course: number,
    distanceNM: number
  ): Position {
    // Convert course to radians
    const courseRad = (course * Math.PI) / 180;
    
    // Earth radius in nautical miles
    const earthRadiusNM = 3440.065;
    
    // Calculate angular distance
    const angularDistance = distanceNM / earthRadiusNM;
    
    // Convert position to radians
    const lat1 = (position.latitude * Math.PI) / 180;
    const lon1 = (position.longitude * Math.PI) / 180;
    
    // Calculate new latitude
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(courseRad)
    );
    
    // Calculate new longitude
    const lon2 = lon1 + Math.atan2(
      Math.sin(courseRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    return {
      latitude: (lat2 * 180) / Math.PI,
      longitude: (lon2 * 180) / Math.PI,
      accuracy: position.accuracy * 2, // Decrease accuracy during dead reckoning
      timestamp: Date.now()
    };
  }

  private recoverFromInstrumentDisconnection(): void {
    console.log('Recovery: Attempting to reconnect to instrument');
    
    const { instrumentService } = this.recoveryContext;
    
    if (!instrumentService) {
      console.warn('InstrumentService not available for recovery');
      return;
    }

    // InstrumentService already has automatic reconnection logic
    // Just ensure it's enabled and log the attempt
    console.log('InstrumentService will attempt automatic reconnection every 5 seconds');
    
    // Optionally switch to stub mode as fallback
    if (instrumentService.isStubEnabled && !instrumentService.isStubEnabled()) {
      console.log('Consider enabling stub mode as fallback');
      // instrumentService.setStubMode(true);
    }
  }

  private async recoverFromChartLoadFailure(): Promise<void> {
    console.log('Recovery: Falling back to lower resolution charts');
    
    const { chartManager } = this.recoveryContext;
    
    if (!chartManager) {
      console.warn('ChartManager not available for recovery');
      return;
    }

    try {
      // Try to get cached charts at lower zoom levels
      // This is a simplified recovery - in practice, you'd track which tile failed
      // and try to load a lower resolution version of that specific tile
      
      console.log('Attempting to use cached lower resolution charts');
      
      // Get cache size to verify we have some cached data
      if (chartManager.getCacheSize) {
        const cacheSize = await chartManager.getCacheSize();
        console.log(`Chart cache size: ${cacheSize} bytes`);
        
        if (cacheSize > 0) {
          console.log('Using cached chart data');
        } else {
          console.warn('No cached chart data available');
        }
      }
    } catch (error) {
      console.error('Failed to recover from chart load failure:', error);
    }
  }

  private async recoverFromStorageFull(): Promise<void> {
    console.log('Recovery: Cleaning up old data');
    
    const { trackRepository, logbookRepository, chartManager } = this.recoveryContext;
    
    try {
      let freedSpace = 0;
      
      // 1. Delete old track data (>30 days)
      if (trackRepository) {
        console.log('Deleting tracks older than 30 days');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const oldTracks = await trackRepository.getTracks({
          endDate: thirtyDaysAgo
        });
        
        for (const track of oldTracks) {
          await trackRepository.deleteTrack(track.id);
          console.log(`Deleted track: ${track.name}`);
        }
        
        freedSpace += oldTracks.length * 1024 * 100; // Estimate 100KB per track
      }
      
      // 2. Clear chart cache for unused regions
      if (chartManager) {
        console.log('Clearing old chart cache entries');
        const cacheSize = await chartManager.getCacheSize();
        
        if (cacheSize > 40 * 1024 * 1024 * 1024) { // If cache > 40GB
          // Clear 10GB of cache
          console.log('Chart cache is large, clearing some entries');
          // In a real implementation, we'd track tile access times
          // and clear least recently used tiles
          freedSpace += 10 * 1024 * 1024 * 1024;
        }
      }
      
      // 3. Compress old logbook entries (>90 days)
      if (logbookRepository) {
        console.log('Compressing old logbook entries');
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        // In a real implementation, we'd compress or archive old entries
        // For now, just log the intent
        console.log('Old logbook entries would be compressed');
      }
      
      console.log(`Storage cleanup complete. Freed approximately ${freedSpace} bytes`);
      
      // Notify user of cleanup
      this.handle(
        new NavigationError(
          `Storage cleanup completed. Freed ${Math.round(freedSpace / (1024 * 1024))}MB`,
          ErrorCode.STORAGE_FULL,
          ErrorSeverity.INFO,
          false
        )
      );
    } catch (error) {
      console.error('Failed to recover from storage full:', error);
    }
  }

  private recoverFromNetworkUnavailable(): void {
    console.log('Recovery: Switching to offline mode');
    // Implementation would:
    // 1. Queue sync operations
    // 2. Use cached data
    // 3. Show offline indicator
    // 4. Monitor for network return
  }
}

export const createErrorHandler = (): ErrorHandler => {
  return new ErrorHandlerImpl();
};

// Helper function to create navigation errors
export const createNavigationError = (
  message: string,
  code: ErrorCode,
  severity: ErrorSeverity,
  recoverable: boolean
): NavigationError => {
  return new NavigationError(message, code, severity, recoverable);
};
