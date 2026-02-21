import { Subject, Observable } from "rxjs";
import { ConnectivityMonitor, createConnectivityMonitor } from "./ConnectivityMonitor";

export type SyncOperation = {
  id: string;
  type: "create" | "update" | "delete";
  entity: string;
  entityId: string;
  data: unknown;
  timestamp: number;
  retries: number;
  version?: number;
};

export interface NetworkStatus {
  online: boolean;
  lastChecked: number;
}

export interface ConflictResolution {
  strategy: "local" | "remote" | "merge" | "manual";
  resolvedData?: unknown;
}

export interface SyncResult {
  success: boolean;
  operationId: string;
  error?: string;
  conflict?: {
    localData: unknown;
    remoteData: unknown;
    resolution: ConflictResolution;
  };
}

export interface SyncHandler {
  execute(operation: SyncOperation): Promise<SyncResult>;
  checkConflict?(operation: SyncOperation): Promise<boolean>;
  resolveConflict?(
    operation: SyncOperation,
    remoteData: unknown,
  ): Promise<ConflictResolution>;
}

export class SyncManager {
  private operationQueue: SyncOperation[] = [];
  private syncInProgress = false;
  private networkStatus: NetworkStatus = {
    online: true,
    lastChecked: Date.now(),
  };
  private statusSubject = new Subject<boolean>();
  private syncResultSubject = new Subject<SyncResult>();
  private retryInterval: ReturnType<typeof setInterval> | null = null;
  private maxRetries = 3;
  private handlers: Map<string, SyncHandler> = new Map();
  private conflictResolutionStrategy: "local" | "remote" | "merge" = "local";
  private connectivityMonitor: ConnectivityMonitor | null = null;

  constructor(connectivityMonitor?: ConnectivityMonitor) {
    this.connectivityMonitor = connectivityMonitor || null;

    // Subscribe to connectivity changes if monitor is provided
    if (this.connectivityMonitor) {
      this.connectivityMonitor.onStatusChange().subscribe((status) => {
        this.setOnlineStatus(status.online);
      });
    }
  }

  /**
   * Register a handler for a specific entity type
   */
  registerHandler(entity: string, handler: SyncHandler): void {
    this.handlers.set(entity, handler);
  }

  /**
   * Set the default conflict resolution strategy
   */
  setConflictResolutionStrategy(
    strategy: "local" | "remote" | "merge",
  ): void {
    this.conflictResolutionStrategy = strategy;
  }

  /**
   * Queue an operation for synchronization
   */
  async queueOperation(
    operation: Omit<SyncOperation, "id" | "timestamp" | "retries">,
  ): Promise<string> {
    const op: SyncOperation = {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    // Check for duplicate operations on the same entity
    const existingIndex = this.operationQueue.findIndex(
      (queuedOp) =>
        queuedOp.entity === op.entity &&
        queuedOp.entityId === op.entityId &&
        queuedOp.type === op.type,
    );

    if (existingIndex !== -1) {
      // Replace existing operation with newer one
      this.operationQueue[existingIndex] = op;
    } else {
      this.operationQueue.push(op);
    }

    if (this.networkStatus.online) {
      // Don't await to avoid blocking
      this.processQueue().catch((error) => {
        console.error("Error processing queue:", error);
      });
    }

    return op.id;
  }

  /**
   * Process the operation queue
   */
  async processQueue(): Promise<void> {
    if (this.syncInProgress || !this.networkStatus.online) {
      return;
    }

    this.syncInProgress = true;

    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue[0];

      try {
        const result = await this.executeOperation(operation);

        if (result.success) {
          this.operationQueue.shift();
          this.syncResultSubject.next(result);
        } else if (result.conflict) {
          // Handle conflict
          const resolution = await this.handleConflict(
            operation,
            result.conflict.remoteData,
          );

          if (resolution.strategy === "manual") {
            // Keep in queue for manual resolution
            this.syncResultSubject.next(result);
            break;
          } else {
            // Apply automatic resolution
            operation.data = resolution.resolvedData;
            operation.retries = 0;
            // Will retry on next iteration
          }
        } else {
          throw new Error(result.error || "Unknown error");
        }
      } catch (error) {
        operation.retries++;

        if (operation.retries >= this.maxRetries) {
          console.error(
            `Operation ${operation.id} failed after ${this.maxRetries} retries:`,
            error,
          );
          this.syncResultSubject.next({
            success: false,
            operationId: operation.id,
            error:
              error instanceof Error ? error.message : "Unknown error",
          });
          this.operationQueue.shift();
        } else {
          // Exponential backoff
          await this.delay(1000 * Math.pow(2, operation.retries - 1));
        }
      }
    }

    this.syncInProgress = false;
  }

  /**
   * Execute a single sync operation
   */
  private async executeOperation(
    operation: SyncOperation,
  ): Promise<SyncResult> {
    const handler = this.handlers.get(operation.entity);

    if (!handler) {
      console.warn(
        `No handler registered for entity: ${operation.entity}. Using default handler.`,
      );
      return this.defaultExecute(operation);
    }

    // Check for conflicts if handler supports it
    if (handler.checkConflict) {
      const hasConflict = await handler.checkConflict(operation);

      if (hasConflict && handler.resolveConflict) {
        // Simulate fetching remote data
        const remoteData = await this.fetchRemoteData(operation);

        return {
          success: false,
          operationId: operation.id,
          conflict: {
            localData: operation.data,
            remoteData,
            resolution: { strategy: "manual" },
          },
        };
      }
    }

    return handler.execute(operation);
  }

  /**
   * Default execution for operations without a handler
   */
  private async defaultExecute(
    operation: SyncOperation,
  ): Promise<SyncResult> {
    console.log(
      `Executing sync operation: ${operation.type} ${operation.entity} (${operation.entityId})`,
    );

    // Simulate network delay
    await this.delay(100);

    return {
      success: true,
      operationId: operation.id,
    };
  }

  /**
   * Handle conflict resolution
   */
  private async handleConflict(
    operation: SyncOperation,
    remoteData: unknown,
  ): Promise<ConflictResolution> {
    const handler = this.handlers.get(operation.entity);

    if (handler?.resolveConflict) {
      return handler.resolveConflict(operation, remoteData);
    }

    // Use default strategy
    switch (this.conflictResolutionStrategy) {
      case "local":
        return {
          strategy: "local",
          resolvedData: operation.data,
        };
      case "remote":
        return {
          strategy: "remote",
          resolvedData: remoteData,
        };
      case "merge":
        return {
          strategy: "merge",
          resolvedData: this.mergeData(operation.data, remoteData),
        };
      default:
        return {
          strategy: "manual",
        };
    }
  }

  /**
   * Simple merge strategy for conflict resolution
   */
  private mergeData(localData: unknown, remoteData: unknown): unknown {
    if (
      typeof localData === "object" &&
      localData !== null &&
      typeof remoteData === "object" &&
      remoteData !== null
    ) {
      return { ...remoteData, ...localData };
    }
    return localData;
  }

  /**
   * Simulate fetching remote data
   */
  private async fetchRemoteData(
    operation: SyncOperation,
  ): Promise<unknown> {
    // In a real implementation, this would fetch from a remote server
    await this.delay(50);
    return { version: (operation.version || 0) + 1 };
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return [...this.operationQueue];
  }

  /**
   * Get count of pending operations
   */
  getPendingCount(): number {
    return this.operationQueue.length;
  }

  /**
   * Clear the operation queue
   */
  clearQueue(): void {
    this.operationQueue = [];
  }

  /**
   * Remove a specific operation from the queue
   */
  removeOperation(operationId: string): boolean {
    const index = this.operationQueue.findIndex((op) => op.id === operationId);
    if (index !== -1) {
      this.operationQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(online: boolean): void {
    const wasOnline = this.networkStatus.online;
    this.networkStatus = {
      online,
      lastChecked: Date.now(),
    };

    this.statusSubject.next(online);

    // Trigger sync when coming back online
    if (!wasOnline && online && this.operationQueue.length > 0) {
      this.processQueue().catch((error) => {
        console.error("Error processing queue after coming online:", error);
      });
    }
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.networkStatus.online;
  }

  /**
   * Get network status details
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(): Observable<boolean> {
    return this.statusSubject.asObservable();
  }

  /**
   * Subscribe to sync results
   */
  onSyncResult(): Observable<SyncResult> {
    return this.syncResultSubject.asObservable();
  }

  /**
   * Start monitoring network connectivity
   */
  startConnectivityMonitoring(interval = 30000): void {
    if (this.connectivityMonitor) {
      // Use the provided connectivity monitor
      this.connectivityMonitor.start();
      return;
    }

    // Fallback to legacy implementation
    if (this.retryInterval) {
      return; // Already monitoring
    }

    this.retryInterval = setInterval(async () => {
      const wasOnline = this.networkStatus.online;

      try {
        // Try to fetch a lightweight resource
        const response = await fetch("https://www.google.com", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-cache",
        });
        this.setOnlineStatus(true);
      } catch {
        this.setOnlineStatus(false);
      }

      // Process queue if we just came back online
      if (!wasOnline && this.networkStatus.online) {
        await this.processQueue();
      }
    }, interval);
  }

  /**
   * Stop monitoring network connectivity
   */
  stopConnectivityMonitoring(): void {
    if (this.connectivityMonitor) {
      this.connectivityMonitor.stop();
      return;
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a SyncManager instance
 */
export const createSyncManager = (connectivityMonitor?: ConnectivityMonitor): SyncManager => {
  return new SyncManager(connectivityMonitor);
};
