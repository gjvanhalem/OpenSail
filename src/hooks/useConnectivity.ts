import { useEffect, useState } from "react";
import { ConnectivityMonitor, ConnectivityStatus } from "../services/ConnectivityMonitor";

/**
 * Hook to monitor network connectivity status
 */
export const useConnectivity = (monitor: ConnectivityMonitor) => {
  const [status, setStatus] = useState<ConnectivityStatus>(monitor.getStatus());
  const [isOnline, setIsOnline] = useState<boolean>(monitor.isOnline());

  useEffect(() => {
    const subscription = monitor.onStatusChange().subscribe((newStatus) => {
      setStatus(newStatus);
      setIsOnline(newStatus.online);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [monitor]);

  return {
    status,
    isOnline,
    isOffline: !isOnline,
    connectionType: status.type,
    lastChecked: status.lastChecked,
  };
};
