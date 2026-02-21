/**
 * ErrorHandler Service
 * 
 * Centralized error handling service that:
 * - Categorizes errors by severity
 * - Logs errors appropriately
 * - Provides user-friendly error messages
 * - Integrates with notification system
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  timestamp: Date;
  context?: string;
  originalError?: Error;
}

export type ErrorCallback = (error: AppError) => void;

class ErrorHandlerService {
  private errorCallbacks: ErrorCallback[] = [];
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  /**
   * Register a callback to be notified of errors
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Handle an error with context
   */
  handle(error: Error | string, context: string, severity: ErrorSeverity = 'error'): void {
    const appError = this.createAppError(error, context, severity);
    this.logError(appError);
    this.notifyCallbacks(appError);
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: Error, context: string): void {
    const appError: AppError = {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed. The app will continue to work offline.',
      severity: 'warning',
      recoverable: true,
      timestamp: new Date(),
      context,
      originalError: error,
    };
    
    this.logError(appError);
    this.notifyCallbacks(appError);
  }

  /**
   * Handle storage errors (IndexedDB quota exceeded, etc.)
   */
  handleStorageError(error: Error, context: string): void {
    const isQuotaError = error.name === 'QuotaExceededError' || 
                         error.message.includes('quota');
    
    const appError: AppError = {
      code: isQuotaError ? 'STORAGE_QUOTA_EXCEEDED' : 'STORAGE_ERROR',
      message: isQuotaError 
        ? 'Storage quota exceeded. Please clear some cached data in Settings.'
        : 'Failed to save data. Please check available storage.',
      severity: 'error',
      recoverable: isQuotaError,
      timestamp: new Date(),
      context,
      originalError: error,
    };
    
    this.logError(appError);
    this.notifyCallbacks(appError);
  }

  /**
   * Handle device API errors (Web Serial, Web Bluetooth)
   */
  handleDeviceError(error: Error, context: string, deviceType: 'serial' | 'bluetooth'): void {
    let message = `Failed to connect to ${deviceType} device.`;
    let code = `${deviceType.toUpperCase()}_ERROR`;
    
    // Check for specific error types
    if (error.name === 'NotFoundError') {
      message = `No ${deviceType} device selected.`;
      code = `${deviceType.toUpperCase()}_NOT_FOUND`;
    } else if (error.name === 'NotSupportedError') {
      message = `${deviceType === 'serial' ? 'Web Serial API' : 'Web Bluetooth API'} is not supported in this browser. Please use Chrome or Edge.`;
      code = `${deviceType.toUpperCase()}_NOT_SUPPORTED`;
    } else if (error.name === 'SecurityError') {
      message = `Permission denied to access ${deviceType} device.`;
      code = `${deviceType.toUpperCase()}_PERMISSION_DENIED`;
    }
    
    const appError: AppError = {
      code,
      message,
      severity: error.name === 'NotSupportedError' ? 'warning' : 'error',
      recoverable: error.name !== 'NotSupportedError',
      timestamp: new Date(),
      context,
      originalError: error,
    };
    
    this.logError(appError);
    this.notifyCallbacks(appError);
  }

  /**
   * Handle parsing errors (NMEA, SeaTalk, etc.)
   */
  handleParseError(error: Error, context: string, data?: string): void {
    const appError: AppError = {
      code: 'PARSE_ERROR',
      message: 'Failed to parse instrument data. Data may be corrupted.',
      severity: 'warning',
      recoverable: true,
      timestamp: new Date(),
      context: data ? `${context}: ${data.substring(0, 50)}` : context,
      originalError: error,
    };
    
    // Don't notify for parse errors - they're too common and not critical
    // Just log them for debugging
    this.logError(appError);
  }

  /**
   * Get recent errors from the log
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear the error log
   */
  clearLog(): void {
    this.errorLog = [];
  }

  /**
   * Create an AppError from various error types
   */
  private createAppError(
    error: Error | string,
    context: string,
    severity: ErrorSeverity
  ): AppError {
    const message = typeof error === 'string' ? error : error.message;
    const originalError = typeof error === 'string' ? undefined : error;
    
    return {
      code: 'GENERIC_ERROR',
      message: this.getUserFriendlyMessage(message),
      severity,
      recoverable: severity !== 'critical',
      timestamp: new Date(),
      context,
      originalError,
    };
  }

  /**
   * Convert technical error messages to user-friendly ones
   */
  private getUserFriendlyMessage(message: string): string {
    // Map common technical errors to user-friendly messages
    const messageMap: Record<string, string> = {
      'Failed to fetch': 'Network connection failed',
      'NetworkError': 'Network connection failed',
      'TypeError': 'An unexpected error occurred',
      'undefined is not an object': 'An unexpected error occurred',
      'Cannot read property': 'An unexpected error occurred',
    };
    
    for (const [technical, friendly] of Object.entries(messageMap)) {
      if (message.includes(technical)) {
        return friendly;
      }
    }
    
    return message;
  }

  /**
   * Log error to console and internal log
   */
  private logError(error: AppError): void {
    // Add to internal log
    this.errorLog.push(error);
    
    // Trim log if it exceeds max size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
    
    // Log to console based on severity
    const logMessage = `[${error.severity.toUpperCase()}] ${error.context}: ${error.message}`;
    
    switch (error.severity) {
      case 'critical':
      case 'error':
        console.error(logMessage, error.originalError);
        break;
      case 'warning':
        console.warn(logMessage, error.originalError);
        break;
      case 'info':
        console.info(logMessage);
        break;
    }
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(error: AppError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerService();
