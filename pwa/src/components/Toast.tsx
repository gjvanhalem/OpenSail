import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { removeNotification } from '../store/slices/notificationsSlice';
import type { Notification } from '../store/slices/notificationsSlice';

/**
 * Toast Component
 * 
 * Displays notifications in a toast/snackbar style
 * Supports different severity levels with appropriate styling
 * Auto-dismisses after duration or allows manual dismissal
 */
export function Toast() {
  const notifications = useAppSelector(state => state.notifications.notifications);
  const dispatch = useAppDispatch();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map(notification => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={() => dispatch(removeNotification(notification.id))}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  notification: Notification;
  onDismiss: () => void;
}

function ToastItem({ notification, onDismiss }: ToastItemProps) {
  // Auto-dismiss after duration
  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        onDismiss();
      }, notification.duration);
      
      return () => clearTimeout(timer);
    }
  }, [notification.duration, onDismiss]);

  // Get styling based on severity
  const severityStyles = {
    info: {
      bg: 'bg-blue-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-yellow-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    error: {
      bg: 'bg-red-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    critical: {
      bg: 'bg-red-700',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
  };

  const style = severityStyles[notification.severity];

  return (
    <div
      className={`${style.bg} text-white rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in-right`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {style.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium break-words">
          {notification.message}
        </p>
        
        {notification.action && (
          <button
            onClick={() => {
              notification.action!.onClick();
              onDismiss();
            }}
            className="mt-2 text-sm font-medium underline hover:no-underline"
          >
            {notification.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
