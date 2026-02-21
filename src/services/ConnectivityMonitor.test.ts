import { ConnectivityMonitor, ConnectivityStatus } from "./ConnectivityMonitor";

// Mock fetch
global.fetch = jest.fn();

describe("ConnectivityMonitor", () => {
  let monitor: ConnectivityMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new ConnectivityMonitor({
      checkInterval: 1000,
      timeout: 500,
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe("Initialization", () => {
    it("should initialize with default online status", () => {
      expect(monitor.isOnline()).toBe(true);
    });

    it("should accept custom configuration", () => {
      const customMonitor = new ConnectivityMonitor({
        checkInterval: 5000,
        checkUrl: "https://example.com",
        timeout: 3000,
      });

      expect(customMonitor).toBeDefined();
      customMonitor.stop();
    });
  });

  describe("Connectivity Checking", () => {
    it("should detect online status", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const status = await monitor.checkConnectivity();

      expect(status.online).toBe(true);
      expect(status.lastChecked).toBeDefined();
    });

    it("should detect offline status", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const status = await monitor.checkConnectivity();

      expect(status.online).toBe(false);
      expect(status.lastChecked).toBeDefined();
    });

    it("should handle timeout", async () => {
      // Mock fetch to reject with abort error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("The operation was aborted"),
      );

      const status = await monitor.checkConnectivity();

      // Should be offline due to timeout/abort
      expect(status.online).toBe(false);
    });
  });

  describe("Status Changes", () => {
    it("should emit status change events", (done) => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const subscription = monitor.onStatusChange().subscribe((status) => {
        expect(status.online).toBe(false);
        subscription.unsubscribe();
        done();
      });

      monitor.checkConnectivity();
    });

    it("should not emit if status unchanged", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      let emitCount = 0;
      const subscription = monitor.onStatusChange().subscribe(() => {
        emitCount++;
      });

      await monitor.checkConnectivity();
      await monitor.checkConnectivity();

      expect(emitCount).toBe(0); // No change from initial online status

      subscription.unsubscribe();
    });
  });

  describe("Monitoring Control", () => {
    it("should start monitoring", () => {
      monitor.start();
      // Should not throw
      expect(monitor).toBeDefined();
    });

    it("should stop monitoring", () => {
      monitor.start();
      monitor.stop();
      // Should not throw
      expect(monitor).toBeDefined();
    });

    it("should not start monitoring twice", () => {
      monitor.start();
      monitor.start();
      // Should not throw
      expect(monitor).toBeDefined();
    });
  });

  describe("Status Retrieval", () => {
    it("should get current status", () => {
      const status = monitor.getStatus();

      expect(status).toHaveProperty("online");
      expect(status).toHaveProperty("type");
      expect(status).toHaveProperty("lastChecked");
    });

    it("should check online status", () => {
      expect(typeof monitor.isOnline()).toBe("boolean");
    });
  });

  describe("Connection Type Detection", () => {
    it("should detect connection type", () => {
      const status = monitor.getStatus();
      expect(status.type).toBeDefined();
      expect(["wifi", "cellular", "ethernet", "unknown"]).toContain(status.type);
    });
  });

  describe("Browser Events", () => {
    it("should handle online event", () => {
      const originalWindow = global.window;

      // Mock window object
      (global as any).window = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      const newMonitor = new ConnectivityMonitor();
      newMonitor.start();

      expect(global.window.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(global.window.addEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );

      newMonitor.stop();

      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );

      global.window = originalWindow;
    });
  });
});
