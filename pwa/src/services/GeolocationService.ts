import type { Position } from '@/models';
import { NavigationError, ErrorCode, ErrorSeverity } from '@/models';
import { updatePosition, setGPSActive } from '@/store/slices/navigationSlice';
import type { AppDispatch } from '@/store';

export interface GeolocationServiceConfig {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  minAccuracy?: number; // Minimum acceptable accuracy in meters
}

export class GeolocationService {
  private watchId: number | null = null;
  private dispatch: AppDispatch | null = null;
  private config: Required<GeolocationServiceConfig>;
  private isActive = false;
  private lastPosition: Position | null = null;
  private errorCallback: ((error: NavigationError) => void) | null = null;

  constructor(config: GeolocationServiceConfig = {}) {
    this.config = {
      enableHighAccuracy: config.enableHighAccuracy ?? true,
      timeout: config.timeout ?? 10000,
      maximumAge: config.maximumAge ?? 0,
      minAccuracy: config.minAccuracy ?? 50, // 50 meters default
    };
  }

  /**
   * Initialize the service with Redux dispatch
   */
  public initialize(dispatch: AppDispatch): void {
    this.dispatch = dispatch;
  }

  /**
   * Set error callback for handling geolocation errors
   */
  public onError(callback: (error: NavigationError) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Check if Geolocation API is supported
   */
  public isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Start watching position updates
   */
  public async start(): Promise<void> {
    if (!this.isSupported()) {
      const error = new NavigationError(
        'Geolocation API is not supported in this browser',
        ErrorCode.GPS_SIGNAL_LOST,
        ErrorSeverity.CRITICAL,
        false
      );
      this.handleError(error);
      throw error;
    }

    if (!this.dispatch) {
      throw new Error('GeolocationService not initialized. Call initialize() first.');
    }

    if (this.isActive) {
      console.warn('GeolocationService is already active');
      return;
    }

    // Request permission and start watching
    try {
      this.watchId = navigator.geolocation.watchPosition(
        this.handlePosition.bind(this),
        this.handleGeolocationError.bind(this),
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge,
        }
      );

      this.isActive = true;
      this.dispatch(setGPSActive(true));
      console.log('GeolocationService started successfully');
    } catch {
      const navError = new NavigationError(
        'Failed to start geolocation service',
        ErrorCode.GPS_SIGNAL_LOST,
        ErrorSeverity.ERROR,
        true
      );
      this.handleError(navError);
      throw navError;
    }
  }

  /**
   * Stop watching position updates
   */
  public stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isActive = false;
    if (this.dispatch) {
      this.dispatch(setGPSActive(false));
    }
    console.log('GeolocationService stopped');
  }

  /**
   * Get current position once (not continuous)
   */
  public async getCurrentPosition(): Promise<Position> {
    if (!this.isSupported()) {
      throw new NavigationError(
        'Geolocation API is not supported',
        ErrorCode.GPS_SIGNAL_LOST,
        ErrorSeverity.ERROR,
        false
      );
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (geoPosition) => {
          const position = this.convertToPosition(geoPosition);
          resolve(position);
        },
        (error) => {
          const navError = this.convertGeolocationError(error);
          reject(navError);
        },
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge,
        }
      );
    });
  }

  /**
   * Get the last known position
   */
  public getLastPosition(): Position | null {
    return this.lastPosition;
  }

  /**
   * Check if service is currently active
   */
  public getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<GeolocationServiceConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // Restart if active to apply new config
    if (this.isActive) {
      this.stop();
      this.start();
    }
  }

  /**
   * Handle position updates from Geolocation API
   */
  private handlePosition(geoPosition: GeolocationPosition): void {
    const position = this.convertToPosition(geoPosition);

    // Check accuracy threshold
    if (position.accuracy > this.config.minAccuracy) {
      console.warn(
        `Position accuracy (${position.accuracy}m) exceeds threshold (${this.config.minAccuracy}m)`
      );
      // Still dispatch but log warning
    }

    this.lastPosition = position;

    // Dispatch to Redux
    if (this.dispatch) {
      this.dispatch(updatePosition(position));
    }

    console.log('Position updated:', {
      lat: position.latitude.toFixed(6),
      lon: position.longitude.toFixed(6),
      accuracy: position.accuracy.toFixed(1) + 'm',
    });
  }

  /**
   * Handle geolocation errors
   */
  private handleGeolocationError(error: GeolocationPositionError): void {
    const navError = this.convertGeolocationError(error);
    this.handleError(navError);

    // Set GPS as inactive
    if (this.dispatch) {
      this.dispatch(setGPSActive(false));
    }
  }

  /**
   * Convert GeolocationPosition to our Position model
   */
  private convertToPosition(geoPosition: GeolocationPosition): Position {
    return {
      latitude: geoPosition.coords.latitude,
      longitude: geoPosition.coords.longitude,
      accuracy: geoPosition.coords.accuracy,
      timestamp: geoPosition.timestamp,
      altitude: geoPosition.coords.altitude ?? undefined,
    };
  }

  /**
   * Convert GeolocationPositionError to NavigationError
   */
  private convertGeolocationError(error: GeolocationPositionError): NavigationError {
    let message: string;
    let severity: ErrorSeverity;
    let recoverable: boolean;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied by user';
        severity = ErrorSeverity.ERROR;
        recoverable = false;
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        severity = ErrorSeverity.WARNING;
        recoverable = true;
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        severity = ErrorSeverity.WARNING;
        recoverable = true;
        break;
      default:
        message = 'Unknown geolocation error';
        severity = ErrorSeverity.ERROR;
        recoverable = true;
    }

    return new NavigationError(message, ErrorCode.GPS_SIGNAL_LOST, severity, recoverable);
  }

  /**
   * Handle errors by calling error callback
   */
  private handleError(error: NavigationError): void {
    console.error('GeolocationService error:', error.message);
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
}

// Singleton instance
let geolocationServiceInstance: GeolocationService | null = null;

/**
 * Get or create the singleton GeolocationService instance
 */
export function getGeolocationService(
  config?: GeolocationServiceConfig
): GeolocationService {
  if (!geolocationServiceInstance) {
    geolocationServiceInstance = new GeolocationService(config);
  }
  return geolocationServiceInstance;
}
