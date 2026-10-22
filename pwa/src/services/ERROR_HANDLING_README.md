# Error Handling and Notification System

This document describes the error handling and notification system implemented in the PWA.

## Overview

The system consists of three main components:

1. **ErrorHandler Service** - Centralized error handling and logging
2. **Notification System** - Redux-based notification queue with Toast UI
3. **ErrorBoundary** - React error boundary for catching component errors

## ErrorHandler Service

Located in `services/ErrorHandler.ts`, this service provides:

### Features

- Categorizes errors by severity (info, warning, error, critical)
- Provides user-friendly error messages
- Logs errors to console and internal log
- Notifies registered callbacks
- Specialized handlers for different error types

### Usage

```typescript
import { errorHandler } from '@/services/ErrorHandler';

// Handle a generic error
try {
  // some code
} catch (error) {
  errorHandler.handle(error, 'MyComponent.myMethod', 'error');
}

// Handle specific error types
errorHandler.handleStorageError(error, 'Database.save');
errorHandler.handleDeviceError(error, 'SerialConnection.connect', 'serial');
errorHandler.handleParseError(error, 'NMEA0183Parser.parse', rawData);

// Subscribe to errors
const unsubscribe = errorHandler.onError((error) => {
  console.log('Error occurred:', error);
});

// Get recent errors
const recentErrors = errorHandler.getRecentErrors(10);
```

### Error Types

#### Storage Errors
- Detects quota exceeded errors
- Points the user to the offline chart regions on the Chart page and old tracks
- Severity: error

#### Device Errors
- Handles Web Serial and Web Bluetooth API errors (`deviceType` is `'serial'` or `'bluetooth'`)
- Detects no device selected, unsupported browser and permission denied
- Severity: warning (unsupported) or error (connection failed)
- Wi-Fi connections (WebSocket, native TCP) report their errors through the connection status instead

#### Parse Errors
- For protocol parsing errors (NMEA, SeaTalk)
- Logged but not displayed (too noisy)
- Severity: warning
- The parsers don't call it at present: they skip sentences they can't parse

## Notification System

Located in `store/slices/notificationsSlice.ts` and `components/Toast.tsx`.

### Features

- Redux-based notification queue
- Auto-dismiss based on severity
- Manual dismiss option
- Action buttons for notifications
- Animated toast UI

### Usage

```typescript
import { useAppDispatch } from '@/store/hooks';
import { addNotification, showInfo, showWarning, showError } from '@/store/slices/notificationsSlice';

const dispatch = useAppDispatch();

// Simple notifications
dispatch(showInfo('Route saved successfully'));
dispatch(showWarning('GPS signal weak'));
dispatch(showError('Failed to connect to instrument'));

// Advanced notification with action
dispatch(addNotification({
  message: 'Storage quota exceeded',
  severity: 'error',
  duration: undefined, // Manual dismiss
  action: {
    label: 'Clear Cache',
    onClick: () => {
      // Handle action
    }
  }
}));
```

### Auto-Dismiss Durations

- Info: 3 seconds
- Warning: 5 seconds
- Error: 7 seconds
- Critical: Manual dismiss only

## ErrorBoundary Component

Located in `components/ErrorBoundary.tsx`.

### Features

- Catches React component errors
- Displays fallback UI
- Integrates with ErrorHandler service
- Provides reset and reload options

### Usage

The ErrorBoundary is already integrated at the app root level in `App.tsx`. All React errors are automatically caught and handled.

For custom fallback UI:

```typescript
<ErrorBoundary fallback={<CustomErrorUI />}>
  <MyComponent />
</ErrorBoundary>
```

## Integration with Existing Services

The error handling system is integrated into:

### SerialConnection
- Handles Web Serial API errors
- Detects unsupported browsers
- Reports connection failures

### BluetoothConnection
- Handles Web Bluetooth API errors
- Detects unsupported browsers
- Reports pairing failures

### ChartDownloadService
- Handles storage quota errors
- Reports download failures

### GPS (GPSControl, useGpsAutoStart)
- Reports geolocation errors and a GPS mode that couldn't be resumed after a restart

## Error Handler Hook

Located in `hooks/useErrorHandler.ts`.

This hook connects the ErrorHandler service to the notification system. It's used once at the app root level to automatically display notifications for all errors.

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function App() {
  useErrorHandler(); // Connect error handler to notifications
  
  return <YourApp />;
}
```

## Best Practices

### When to Use Each Error Handler

1. **errorHandler.handle()** - Generic errors, unknown error types
2. **errorHandler.handleStorageError()** - IndexedDB errors, quota exceeded
3. **errorHandler.handleDeviceError()** - Web Serial/Bluetooth errors
4. **errorHandler.handleParseError()** - Protocol parsing errors (NMEA, etc.)

### Error Severity Guidelines

- **info** - Informational messages, successful operations
- **warning** - Non-critical issues, degraded functionality
- **error** - Operation failures, user action required
- **critical** - Application-breaking errors, requires reload

### User-Friendly Messages

The ErrorHandler automatically converts technical error messages to user-friendly ones:

- "Failed to fetch" → "Network connection failed"
- "NotSupportedError" → "Web Serial API is not supported in this browser. Please use Chrome or Edge."

### Error Logging

All errors are:
1. Logged to console (with appropriate level)
2. Stored in internal log (last 100 errors)
3. Sent to registered callbacks
4. Displayed as notifications by `useErrorHandler` (except parse errors)

## Testing

To test the error handling system:

```typescript
// Trigger a test error
errorHandler.handle(new Error('Test error'), 'TestComponent', 'error');

// Trigger a test notification
dispatch(showError('Test notification'));

// Trigger a React error (will be caught by ErrorBoundary)
throw new Error('Test React error');
```

## Future Enhancements

Potential improvements:

1. Error reporting to external service (Sentry, etc.)
2. Error analytics and tracking
3. User feedback on errors
4. Automatic error recovery strategies
5. Offline error queue for sync when online
