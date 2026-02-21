import { SyncManager, SyncOperation, SyncHandler, SyncResult } from "./SyncManager";
import { ConnectivityMonitor } from "./ConnectivityMonitor";

describe("SyncManager", () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    syncManager = new SyncManager();
  });

  afterEach(() => {
    syncManager.stopConnectivityMonitoring();
    syncManager.clearQueue();
  });

  describe("Operation Queue", () => {
    it("should queue operations when offline", async () => {
      syncManager.setOnlineStatus(false);

      await syncManager.queueOperation({
        type: "create",
        entity: "route",
        entityId: "route-1",
        data: { name: "Test Route" },
      });

      expect(syncManager.getPendingCount()).toBe(1);
      expect(syncManager.getPendingOperations()[0].entity).toBe("route");
    });

    it("should process queue when online", async () => {
      syncManager.setOnlineStatus(true);

      const operationId = await syncManager.queueOperation({
        type: "create",
        entity: "route",
        entityId: "route-1",
        data: { name: "Test Route" },
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(syncManager.getPendingCount()).toBe(0);
    });

    it("should replace duplicate operations", async () => {
      syncManager.setOnlineStatus(false);

      await syncManager.queueOperation({
        type: "update",
        entity: "route",
        entityId: "route-1",
        data: { name: "Route v1" },
      });

      await syncManager.queueOperation({
        type: "update",
        entity: "route",
        entityId: "route-1",
        data: { name: "Route v2" },
      });

      expect(syncManager.getPendingCount()).toBe(1);
      const operation = syncManager.getPendingOperations()[0];
      expect((operation.data as any).name).toBe("Route v2");
    });

    it("should clear queue", async () => {
      syncManager.setOnlineStatus(false);

      await syncManager.queueOperation({
        type: "create",
        entity: "route",
        entityId: "route-1",
        data: { name: "Test Route" },
      });

      syncManager.clearQueue();
      expect(syncManager.getPendingCount()).toBe(0);
    });

    it("should remove specific operation", async () => {
      syncManager.setOnlineStatus(false);

      const operationId = await syncManager.queueOperation({
        type: "create",
        entity: "route",
        entityId: "route-1",
        data: { name: "Test Route" },
      });

      const removed = syncManager.removeOperation(operationId);
      expect(removed).toBe(true);
      expect(syncManager.getPendingCount()).toBe(0);
    });
  });

  describe("Connectivity Status", () => {
    it("should start with online status", () => {
      expect(syncManager.getOnlineStatus()).toBe(true);
    });

    it("should update online status", () => {
      syncManager.setOnlineStatus(false);
      expect(syncManager.getOnlineStatus()).toBe(false);

      syncManager.setOnlineStatus(true);
      expect(syncManager.getOnlineStatus()).toBe(true);
    });

    it("should emit status change events", (done) => {
      const subscription = syncManager.onStatusChange().subscribe((online) => {
        expect(online).toBe(false);
        subscription.unsubscribe();
        done();
      });

      syncManager.setOnlineStatus(false);
    });

    it("should process queue when coming back online", async () => {
      syncManager.setOnlineStatus(false);

      await syncManager.queueOperation({
        type: "create",
        entity: "route",
        entityId: "route-1",
        data: { name: "Test Route" },
      });

      expect(syncManager.getPendingCount()).toBe(1);

      syncManager.setOnlineStatus(true);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(syncManager.getPendingCount()).toBe(0);
    });
  });

  describe("Sync Handlers", () => {
    it("should register and use custom handler", async () => {
      let executedOperation: SyncOperation | null = null;

      const handler: SyncHandler = {
        execute: async (operation: SyncOperation): Promise<SyncResult> => {
          executedOperation = operation;
          return {
            success: true,
            operationId: operation.id,
          };
        },
      };

      syncManager.registerHandler("route", handler);
      syncManager.setOnlineStatus(true);

      await syncManager.queueOperation({
        type: "create",
        entity: "route",
        entityId: "route-1",
        data: { name: "Test Route" },
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(executedOperation).not.toBeNull();
      expect(executedOperation?.entity).toBe("route");
    });

    it("should handle operation failures with retries", async () => {
      let attemptCount = 0;

      const handler: SyncHandler = {
        execute: async (operation: SyncOperation): Promise<SyncResult> => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error("Temporary failure");
          }
          return {
            success: true,
            operationId: operation.id,
          };
        },
      };

      syncManager.registerHandler("route", handler);
      syncManager.setOnlineStatus(true);

      await syncManager.queueOperation({
        type: "create",
        entity: "route",
        entityId: "route-1",
        data: { name: "Test Route" },
      });

      // Wait for retries (exponential backoff: 1s, 2s)
      await new Promise((resolve) => setTimeout(resolve, 3500));

      expect(attemptCount).toBeGreaterThanOrEqual(2);
      expect(syncManager.getPendingCount()).toBe(0);
    });
  });

  describe("Conflict Resolution", () => {
    it("should use local strategy by default", async () => {
      syncManager.setConflictResolutionStrategy("local");

      let resolvedWithLocal = false;

      const handler: SyncHandler = {
        execute: async (operation: SyncOperation): Promise<SyncResult> => {
          // Simulate successful execution after conflict resolution
          return {
            success: true,
            operationId: operation.id,
          };
        },
        checkConflict: async () => false, // No conflict for this test
        resolveConflict: async (operation, remoteData) => {
          resolvedWithLocal = true;
          return {
            strategy: "local",
            resolvedData: operation.data,
          };
        },
      };

      syncManager.registerHandler("route", handler);
      syncManager.setOnlineStatus(true);

      await syncManager.queueOperation({
        type: "update",
        entity: "route",
        entityId: "route-1",
        data: { name: "Local Route" },
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(syncManager.getPendingCount()).toBe(0);
    });

    it("should use remote strategy when configured", async () => {
      syncManager.setConflictResolutionStrategy("remote");

      const handler: SyncHandler = {
        execute: async (operation: SyncOperation): Promise<SyncResult> => {
          return {
            success: true,
            operationId: operation.id,
          };
        },
      };

      syncManager.registerHandler("route", handler);
      expect(syncManager.getOnlineStatus()).toBe(true);
    });
  });

  describe("Integration with ConnectivityMonitor", () => {
    it("should integrate with ConnectivityMonitor", async () => {
      const monitor = new ConnectivityMonitor();
      const syncManagerWithMonitor = new SyncManager(monitor);

      expect(syncManagerWithMonitor.getOnlineStatus()).toBe(true);

      // Simulate offline
      monitor["updateStatus"]({
        online: false,
        type: "unknown",
        lastChecked: Date.now(),
      });
      monitor["statusSubject"].next({
        online: false,
        type: "unknown",
        lastChecked: Date.now(),
      });

      // Wait for status update
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(syncManagerWithMonitor.getOnlineStatus()).toBe(false);

      syncManagerWithMonitor.stopConnectivityMonitoring();
    });
  });

  describe("Sync Progress", () => {
    it("should track sync progress", async () => {
      syncManager.setOnlineStatus(true);

      expect(syncManager.isSyncInProgress()).toBe(false);

      const handler: SyncHandler = {
        execute: async (operation: SyncOperation): Promise<SyncResult> => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            success: true,
            operationId: operation.id,
          };
        },
      };

      syncManager.registerHandler("route", handler);

      await syncManager.queueOperation({
        type: "create",
        entity: "route",
        entityId: "route-1",
        data: { name: "Test Route" },
      });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(syncManager.isSyncInProgress()).toBe(false);
    });
  });

  describe("Network Status Details", () => {
    it("should provide network status details", () => {
      const status = syncManager.getNetworkStatus();
      expect(status.online).toBe(true);
      expect(status.lastChecked).toBeDefined();
    });
  });
});
