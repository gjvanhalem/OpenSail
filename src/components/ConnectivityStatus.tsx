import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ConnectivityMonitor, ConnectivityStatus } from "../services/ConnectivityMonitor";

interface ConnectivityStatusProps {
  monitor: ConnectivityMonitor;
  showWhenOnline?: boolean;
}

/**
 * ConnectivityStatus component displays the current network connectivity status
 */
export const ConnectivityStatusComponent: React.FC<ConnectivityStatusProps> = ({
  monitor,
  showWhenOnline = false,
}) => {
  const [status, setStatus] = useState<ConnectivityStatus>(monitor.getStatus());

  useEffect(() => {
    const subscription = monitor.onStatusChange().subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [monitor]);

  // Don't show anything if online and showWhenOnline is false
  if (status.online && !showWhenOnline) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        status.online ? styles.onlineContainer : styles.offlineContainer,
      ]}
    >
      <View style={[styles.indicator, status.online ? styles.onlineIndicator : styles.offlineIndicator]} />
      <Text style={styles.text}>
        {status.online ? "Online" : "Offline"}
        {status.type && status.type !== "unknown" && ` (${status.type})`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  onlineContainer: {
    backgroundColor: "#e8f5e9",
  },
  offlineContainer: {
    backgroundColor: "#ffebee",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineIndicator: {
    backgroundColor: "#4caf50",
  },
  offlineIndicator: {
    backgroundColor: "#f44336",
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
});
