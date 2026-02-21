import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addNotification } from '../store/slices/notificationsSlice';
import { errorHandler } from '../services/ErrorHandler';

/**
 * Hook to connect ErrorHandler service to notification system
 * 
 * Automatically subscribes to error events and displays notifications
 * Should be used once at the app root level
 */
export function useErrorHandler() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Subscribe to error events
    const unsubscribe = errorHandler.onError((error) => {
      // Don't show notifications for parse errors (too noisy)
      if (error.code === 'PARSE_ERROR') {
        return;
      }

      // Determine auto-dismiss duration based on severity
      let duration: number | undefined;
      switch (error.severity) {
        case 'info':
          duration = 3000;
          break;
        case 'warning':
          duration = 5000;
          break;
        case 'error':
          duration = 7000;
          break;
        case 'critical':
          duration = undefined; // Manual dismiss for critical errors
          break;
      }

      // Dispatch notification
      dispatch(
        addNotification({
          message: error.message,
          severity: error.severity,
          duration,
        })
      );
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [dispatch]);
}
