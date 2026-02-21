import { Subject, Observable } from "rxjs";

export interface ConnectivityStatus {
  online: boolean;
  type?: "wifi" | "cellular" | "ethernet" | "unknown";
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  lastChecked: number;
}

export interface ConnectivityMonitorConfig {
  checkInterval?: number;
  checkUrl?: string;
  timeout?: number;
}

/**
 * ConnectivityMonitor handles network connectivity detection and monitoring
 */
export class ConnectivityMonitor {
  private status: ConnectivityStatus = {
    online: true,
    type: "unknown",
    lastChecked: Date.now(),
  };
  private statusSubject = new Subject<ConnectivityStatus>();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private config: Required<ConnectivityMonitorConfig>;

  constructor(config: ConnectivityMonitorConfig = {}) {
    this.config = {
      checkInterval: config.checkInterval || 30000,
      checkUrl: config.checkUrl || "https://www.google.com",
      timeout: config.timeout || 5000,
    };

    // Initial check
    this.checkConnectivity();
  }

  /**
   * Start monitoring network connectivity
   */
  start(): void {
    if (this.checkInterval) {
      return; // Already monitoring
    }

    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, this.config.checkInterval);

    // Also listen to browser online/offline events if available
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  /**
   * Stop monitoring network connectivity
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
  }

  /**
   * Check network connectivity
   */
  async checkConnectivity(): Promise<ConnectivityStatus> {
    const wasOnline = this.status.online;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      const response = await fetch(this.config.checkUrl, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.updateStatus({
        online: true,
        type: this.detectConnectionType(),
        lastChecked: Date.now(),
      });
    } catch (error) {
      this.updateStatus({
        online: false,
        type: this.detectConnectionType(),
        lastChecked: Date.now(),
      });
    }

    // Emit event if status changed
    if (wasOnline !== this.status.online) {
      this.statusSubject.next(this.status);
    }

    return this.status;
  }

  /**
   * Get current connectivity status
   */
  getStatus(): ConnectivityStatus {
    return { ...this.status };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.status.online;
  }

  /**
   * Subscribe to connectivity status changes
   */
  onStatusChange(): Observable<ConnectivityStatus> {
    return this.statusSubject.asObservable();
  }

  /**
   * Update connectivity status
   */
  private updateStatus(newStatus: ConnectivityStatus): void {
    this.status = newStatus;
  }

  /**
   * Detect connection type (wifi, cellular, etc.)
   */
  private detectConnectionType(): "wifi" | "cellular" | "ethernet" | "unknown" {
    // Check if navigator.connection is available (Network Information API)
    if (
      typeof navigator !== "undefined" &&
      "connection" in navigator &&
      navigator.connection
    ) {
      const connection = navigator.connection as any;

      if (connection.type) {
        switch (connection.type) {
          case "wifi":
            return "wifi";
          case "cellular":
            return "cellular";
          case "ethernet":
            return "ethernet";
          default:
            return "unknown";
        }
      }

      // Fallback to effectiveType
      if (connection.effectiveType) {
        if (connection.effectiveType === "4g") {
          return "wifi"; // Assume 4g is wifi
        } else {
          return "cellular";
        }
      }
    }

    return "unknown";
  }

  /**
   * Handle browser online event
   */
  private handleOnline = (): void => {
    this.updateStatus({
      online: true,
      type: this.detectConnectionType(),
      lastChecked: Date.now(),
    });
    this.statusSubject.next(this.status);
  };

  /**
   * Handle browser offline event
   */
  private handleOffline = (): void => {
    this.updateStatus({
      online: false,
      type: this.detectConnectionType(),
      lastChecked: Date.now(),
    });
    this.statusSubject.next(this.status);
  };
}

/**
 * Factory function to create a ConnectivityMonitor instance
 */
export const createConnectivityMonitor = (
  config?: ConnectivityMonitorConfig,
): ConnectivityMonitor => {
  return new ConnectivityMonitor(config);
};
