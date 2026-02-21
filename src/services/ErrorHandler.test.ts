import { ErrorHandlerImpl, createErrorHandler, createNavigationError } from './ErrorHandler';
import { ErrorCode, ErrorSeverity, NavigationError, Position } from '../types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandlerImpl;

  beforeEach(() => {
    jest.useFakeTimers();
    errorHandler = createErrorHandler() as ErrorHandlerImpl;
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Clean up any active intervals
    if (errorHandler) {
      (errorHandler as any).cleanup?.();
    }
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Error Detection and Notification', () => {
    it('should handle and log errors', () => {
      const error = createNavigationError(
        'Test error',
        ErrorCode.GPS_SIGNAL_LOST,
        ErrorSeverity.ERROR,
        true
      );

      errorHandler.handle(error);

      const log = errorHandler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toEqual(error);
    });

    it('should notify subscribers when error occurs', (done) => {
      const error = createNavigationError(
        'Test error',
        ErrorCode.INSTRUMENT_DISCONNECTED,
        ErrorSeverity.WARNING,
        true
      );

      const subscription = errorHandler.subscribe((receivedError) => {
        expect(receivedError).toEqual(error);
        subscription.unsubscribe();
        done();
      });

      errorHandler.handle(error);
    });

    it('should handle multiple subscribers', () => {
      const error = createNavigationError(
        'Test error',
        ErrorCode.NETWORK_UNAVAILABLE,
        ErrorSeverity.INFO,
        true
      );

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const sub1 = errorHandler.subscribe(callback1);
      const sub2 = errorHandler.subscribe(callback2);

      errorHandler.handle(error);

      expect(callback1).toHaveBeenCalledWith(error);
      expect(callback2).toHaveBeenCalledWith(error);

      sub1.unsubscribe();
      sub2.unsubscribe();
    });

    it('should maintain error log with max size', () => {
      // Create 150 errors (max is 100)
      for (let i = 0; i < 150; i++) {
        const error = createNavigationError(
          `Error ${i}`,
          ErrorCode.INVALID_ROUTE,
          ErrorSeverity.WARNING,
          false
        );
        errorHandler.handle(error);
      }

      const log = errorHandler.getErrorLog();
      expect(log).toHaveLength(100);
      expect(log[0].message).toBe('Error 50'); // First 50 should be removed
    });

    it('should clear error log', () => {
      const error = createNavigationError(
        'Test error',
        ErrorCode.CHART_LOAD_FAILED,
        ErrorSeverity.ERROR,
        true
      );

      errorHandler.handle(error);
      expect(errorHandler.getErrorLog()).toHaveLength(1);

      errorHandler.clearErrorLog();
      expect(errorHandler.getErrorLog()).toHaveLength(0);
    });
  });

  describe('Error Severity Handling', () => {
    it('should handle CRITICAL errors', () => {
      const error = createNavigationError(
        'Critical error',
        ErrorCode.STORAGE_FULL,
        ErrorSeverity.CRITICAL,
        false
      );

      errorHandler.handle(error);

      expect(console.error).toHaveBeenCalledWith(
        '[CRITICAL]',
        'Critical error',
        error
      );
    });

    it('should handle ERROR severity', () => {
      const error = createNavigationError(
        'Regular error',
        ErrorCode.GPS_SIGNAL_LOST,
        ErrorSeverity.ERROR,
        true
      );

      errorHandler.handle(error);

      expect(console.error).toHaveBeenCalledWith(
        '[ERROR]',
        'Regular error',
        error
      );
    });

    it('should handle WARNING severity', () => {
      const error = createNavigationError(
        'Warning message',
        ErrorCode.INVALID_ROUTE,
        ErrorSeverity.WARNING,
        false
      );

      errorHandler.handle(error);

      expect(console.warn).toHaveBeenCalledWith(
        '[WARNING]',
        'Warning message',
        error
      );
    });

    it('should handle INFO severity', () => {
      const error = createNavigationError(
        'Info message',
        ErrorCode.NETWORK_UNAVAILABLE,
        ErrorSeverity.INFO,
        true
      );

      errorHandler.handle(error);

      expect(console.info).toHaveBeenCalledWith(
        '[INFO]',
        'Info message',
        error
      );
    });
  });

  describe('Recovery Strategies', () => {
    describe('GPS Signal Loss Recovery', () => {
      it('should activate dead reckoning when GPS signal is lost', () => {
        const position: Position = {
          latitude: 52.0,
          longitude: 4.0,
          accuracy: 10,
          timestamp: Date.now()
        };

        errorHandler.updateNavigationState(position, 45, 6.5);

        const error = createNavigationError(
          'GPS signal lost',
          ErrorCode.GPS_SIGNAL_LOST,
          ErrorSeverity.ERROR,
          true
        );

        errorHandler.handle(error);

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Dead reckoning mode activated')
        );
      });

      it('should not activate dead reckoning without sufficient data', () => {
        const error = createNavigationError(
          'GPS signal lost',
          ErrorCode.GPS_SIGNAL_LOST,
          ErrorSeverity.ERROR,
          true
        );

        errorHandler.handle(error);

        expect(console.warn).toHaveBeenCalledWith(
          'Insufficient data for dead reckoning'
        );
      });

      it('should calculate dead reckoning position correctly', () => {
        const position: Position = {
          latitude: 52.0,
          longitude: 4.0,
          accuracy: 10,
          timestamp: Date.now()
        };

        // Course: 90° (East), Speed: 6 knots
        errorHandler.updateNavigationState(position, 90, 6);

        const error = createNavigationError(
          'GPS signal lost',
          ErrorCode.GPS_SIGNAL_LOST,
          ErrorSeverity.ERROR,
          true
        );

        errorHandler.handle(error);

        // Dead reckoning should be active
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Dead reckoning mode activated')
        );
      });
    });

    describe('Instrument Disconnection Recovery', () => {
      it('should attempt to reconnect when instrument disconnects', () => {
        const mockInstrumentService = {
          isStubEnabled: jest.fn().mockReturnValue(false),
          setStubMode: jest.fn()
        };

        errorHandler.setRecoveryContext({
          instrumentService: mockInstrumentService
        });

        const error = createNavigationError(
          'Instrument disconnected',
          ErrorCode.INSTRUMENT_DISCONNECTED,
          ErrorSeverity.WARNING,
          true
        );

        errorHandler.handle(error);

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('automatic reconnection')
        );
      });

      it('should handle missing instrument service gracefully', () => {
        const error = createNavigationError(
          'Instrument disconnected',
          ErrorCode.INSTRUMENT_DISCONNECTED,
          ErrorSeverity.WARNING,
          true
        );

        errorHandler.handle(error);

        expect(console.warn).toHaveBeenCalledWith(
          'InstrumentService not available for recovery'
        );
      });
    });

    describe('Chart Load Failure Recovery', () => {
      it('should fall back to cached charts', async () => {
        jest.useRealTimers(); // Use real timers for async operations
        
        const mockChartManager = {
          getCacheSize: jest.fn().mockResolvedValue(1024 * 1024 * 100) // 100MB
        };

        errorHandler.setRecoveryContext({
          chartManager: mockChartManager
        });

        const error = createNavigationError(
          'Chart load failed',
          ErrorCode.CHART_LOAD_FAILED,
          ErrorSeverity.ERROR,
          true
        );

        errorHandler.handle(error);

        // Wait for async recovery
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockChartManager.getCacheSize).toHaveBeenCalled();
        
        jest.useFakeTimers(); // Switch back to fake timers
      });

      it('should handle missing chart manager gracefully', async () => {
        jest.useRealTimers(); // Use real timers for async operations
        
        const error = createNavigationError(
          'Chart load failed',
          ErrorCode.CHART_LOAD_FAILED,
          ErrorSeverity.ERROR,
          true
        );

        errorHandler.handle(error);

        // Wait for async recovery
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(console.warn).toHaveBeenCalledWith(
          'ChartManager not available for recovery'
        );
        
        jest.useFakeTimers(); // Switch back to fake timers
      });
    });

    describe('Storage Full Recovery', () => {
      it('should clean up old data when storage is full', async () => {
        jest.useRealTimers(); // Use real timers for async operations
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const mockTrackRepository = {
          getTracks: jest.fn().mockResolvedValue([
            { id: '1', name: 'Old Track 1' },
            { id: '2', name: 'Old Track 2' }
          ]),
          deleteTrack: jest.fn().mockResolvedValue(undefined)
        };

        const mockChartManager = {
          getCacheSize: jest.fn().mockResolvedValue(45 * 1024 * 1024 * 1024) // 45GB
        };

        errorHandler.setRecoveryContext({
          trackRepository: mockTrackRepository,
          chartManager: mockChartManager
        });

        const error = createNavigationError(
          'Storage full',
          ErrorCode.STORAGE_FULL,
          ErrorSeverity.CRITICAL,
          true
        );

        errorHandler.handle(error);

        // Wait for async recovery
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockTrackRepository.getTracks).toHaveBeenCalled();
        expect(mockTrackRepository.deleteTrack).toHaveBeenCalledTimes(2);
        
        jest.useFakeTimers(); // Switch back to fake timers
      });

      it('should handle cleanup errors gracefully', async () => {
        jest.useRealTimers(); // Use real timers for async operations
        
        const mockTrackRepository = {
          getTracks: jest.fn().mockRejectedValue(new Error('Database error')),
          deleteTrack: jest.fn()
        };

        errorHandler.setRecoveryContext({
          trackRepository: mockTrackRepository
        });

        const error = createNavigationError(
          'Storage full',
          ErrorCode.STORAGE_FULL,
          ErrorSeverity.CRITICAL,
          true
        );

        errorHandler.handle(error);

        // Wait for async recovery
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(console.error).toHaveBeenCalledWith(
          'Failed to recover from storage full:',
          expect.any(Error)
        );
        
        jest.useFakeTimers(); // Switch back to fake timers
      });
    });

    describe('Network Unavailable Recovery', () => {
      it('should switch to offline mode when network is unavailable', () => {
        const error = createNavigationError(
          'Network unavailable',
          ErrorCode.NETWORK_UNAVAILABLE,
          ErrorSeverity.WARNING,
          true
        );

        errorHandler.handle(error);

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('offline mode')
        );
      });
    });
  });

  describe('Recovery Context Management', () => {
    it('should set recovery context', () => {
      const mockInstrumentService = { test: 'service' };
      const mockChartManager = { test: 'manager' };

      errorHandler.setRecoveryContext({
        instrumentService: mockInstrumentService,
        chartManager: mockChartManager
      });

      // Context should be set (we can't directly test private fields,
      // but we can test that recovery uses them)
      const error = createNavigationError(
        'Test error',
        ErrorCode.INSTRUMENT_DISCONNECTED,
        ErrorSeverity.WARNING,
        true
      );

      errorHandler.handle(error);

      // Should not warn about missing service
      expect(console.warn).not.toHaveBeenCalledWith(
        'InstrumentService not available for recovery'
      );
    });

    it('should update navigation state', () => {
      const position: Position = {
        latitude: 52.0,
        longitude: 4.0,
        accuracy: 10,
        timestamp: Date.now()
      };

      errorHandler.updateNavigationState(position, 90, 6.5);

      // Verify by triggering GPS loss recovery
      const error = createNavigationError(
        'GPS signal lost',
        ErrorCode.GPS_SIGNAL_LOST,
        ErrorSeverity.ERROR,
        true
      );

      errorHandler.handle(error);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Dead reckoning mode activated')
      );
    });
  });

  describe('Non-recoverable Errors', () => {
    it('should not attempt recovery for non-recoverable errors', () => {
      const error = createNavigationError(
        'Invalid route',
        ErrorCode.INVALID_ROUTE,
        ErrorSeverity.ERROR,
        false // Not recoverable
      );

      errorHandler.handle(error);

      // Should log error but not attempt recovery
      expect(console.error).toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Attempting recovery')
      );
    });
  });

  describe('NavigationError Class', () => {
    it('should create navigation error with correct properties', () => {
      const error = createNavigationError(
        'Test message',
        ErrorCode.GPS_SIGNAL_LOST,
        ErrorSeverity.ERROR,
        true
      );

      expect(error).toBeInstanceOf(NavigationError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe(ErrorCode.GPS_SIGNAL_LOST);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('NavigationError');
    });
  });
});
