# SyncManager and Connectivity Monitoring

## Overview

The SyncManager provides offline/online synchronization capabilities for the marine navigation system. It queues operations when offline and automatically syncs when connectivity is restored.

## Components

### SyncManager (`SyncManager.ts`)

Manages operation queuing and synchronization with conflict resolution.

**Key Features:**
- Operation queue for offline actions
- Automatic sync when connectivity restored
- Conflict resolution strategies (local, remote, merge)
- Custom handlers for different entity types
- Retry logic with exponential backoff
- Integration with ConnectivityMonitor

**Usage:**

```typescript
import { createSyncManager } from './services/SyncManager';
import { createConnectivityMonitor } from './services/ConnectivityMonitor';

// Create instances
const monitor = createConnectivityMonitor();
const syncManager = createSyncManager(monitor);

// Register a handler for routes
syncManager.registerHandler('route', {
  execute: async (operation) => {
    // Sync route to server
    const response = await fetch('/api/routes', {
      method: operation.type === 'create' ? 'POST' : 'PUT',
      body: JSON.stringify(operation.data),
    });
    
    return {
      success: response.ok,
      operationId: operation.id,
    };
  },
});

// Queue an operation
await syncManager.queueOperation({
  type: 'create',
  entity: 'route',
  entityId: 'route-123',
  data: { name: 'My Route', waypoints: [...] },
});

// Start monitoring
syncManager.startConnectivityMonitoring();

// Subscribe to sync results
syncManager.onSyncResult().subscribe((result) => {
  if (result.success) {
    console.log('Sync successful:', result.operationId);
  } else if (result.conflict) {
    console.log('Conflict detected:', result.conflict);
  }
});
```

### ConnectivityMonitor (`ConnectivityMonitor.ts`)

Monitors network connectivity and detects online/offline status changes.

**Key Features:**
- Periodic connectivity checks
- Browser online/offline event handling
- Connection type detection (wifi, cellular, ethernet)
- Observable status changes

**Usage:**

```typescript
import { createConnectivityMonitor } from './services/ConnectivityMonitor';

const monitor = createConnectivityMonitor({
  checkInterval: 30000, // Check every 30 seconds
  checkUrl: 'https://www.google.com',
  timeout: 5000,
});

// Start monitoring
monitor.start();

// Subscribe to status changes
monitor.onStatusChange().subscribe((status) => {
  console.log('Connectivity:', status.online ? 'Online' : 'Offline');
  console.log('Connection type:', status.type);
});

// Check current status
const isOnline = monitor.isOnline();
```

### ConnectivityStatus Component (`ConnectivityStatus.tsx`)

React component for displaying connectivity status in the UI.

**Usage:**

```typescript
import { ConnectivityStatusComponent } from './components/ConnectivityStatus';
import { createConnectivityMonitor } from './services/ConnectivityMonitor';

const monitor = createConnectivityMonitor();

function App() {
  return (
    <View>
      <ConnectivityStatusComponent 
        monitor={monitor} 
        showWhenOnline={false} // Only show when offline
      />
      {/* Rest of your app */}
    </View>
  );
}
```

### useConnectivity Hook (`useConnectivity.ts`)

React hook for easy integration with components.

**Usage:**

```typescript
import { useConnectivity } from './hooks/useConnectivity';

function MyComponent({ monitor }) {
  const { isOnline, isOffline, connectionType } = useConnectivity(monitor);
  
  return (
    <View>
      <Text>Status: {isOnline ? 'Online' : 'Offline'}</Text>
      {connectionType && <Text>Type: {connectionType}</Text>}
    </View>
  );
}
```

## Conflict Resolution

The SyncManager supports three conflict resolution strategies:

1. **Local**: Keep local changes (default)
2. **Remote**: Accept remote changes
3. **Merge**: Merge local and remote changes

You can set the default strategy:

```typescript
syncManager.setConflictResolutionStrategy('local');
```

Or implement custom conflict resolution in your handler:

```typescript
syncManager.registerHandler('route', {
  execute: async (operation) => { /* ... */ },
  checkConflict: async (operation) => {
    // Check if there's a conflict
    const remote = await fetchRemoteVersion(operation.entityId);
    return remote.version > operation.version;
  },
  resolveConflict: async (operation, remoteData) => {
    // Custom resolution logic
    return {
      strategy: 'merge',
      resolvedData: mergeRoutes(operation.data, remoteData),
    };
  },
});
```

## Testing

Comprehensive tests are provided in:
- `SyncManager.test.ts` - Tests for operation queuing, sync, and conflict resolution
- `ConnectivityMonitor.test.ts` - Tests for connectivity detection and monitoring

Run tests:
```bash
npm test -- --testPathPattern="SyncManager|ConnectivityMonitor"
```

## Requirements Satisfied

- **Requirement 5.2**: Offline operation with full navigation functionality using cached data
- **Requirement 5.5**: Synchronization of cached data with online sources when connectivity restored
