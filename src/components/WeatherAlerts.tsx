import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { WeatherAlert } from '../types';

export interface WeatherAlertsProps {
  alerts: WeatherAlert[];
  onAlertPress?: (alert: WeatherAlert) => void;
  onDismiss?: () => void;
}

export const WeatherAlerts: React.FC<WeatherAlertsProps> = ({
  alerts,
  onAlertPress,
  onDismiss
}) => {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          ⚠️ Weather Alerts ({alerts.length})
        </Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.alertsList}>
        {alerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            style={[
              styles.alertItem,
              styles[`severity_${alert.severity}`]
            ]}
            onPress={() => onAlertPress?.(alert)}
          >
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>
                {getSeverityIcon(alert.severity)}
              </Text>
              <View style={styles.alertHeaderText}>
                <Text style={styles.alertType}>{alert.type}</Text>
                <Text style={styles.alertTime}>
                  {formatAlertTime(alert.validFrom, alert.validTo)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.alertMessage} numberOfLines={3}>
              {alert.message}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

function getSeverityIcon(severity: 'warning' | 'watch' | 'advisory'): string {
  switch (severity) {
    case 'warning':
      return '🚨';
    case 'watch':
      return '⚠️';
    case 'advisory':
      return 'ℹ️';
    default:
      return '📢';
  }
}

function formatAlertTime(validFrom: Date, validTo: Date): string {
  const now = new Date();
  const fromDate = new Date(validFrom);
  const toDate = new Date(validTo);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}`;
  };

  if (fromDate > now) {
    return `Starts ${formatDate(fromDate)} ${formatTime(fromDate)}`;
  }

  if (toDate < now) {
    return `Expired ${formatDate(toDate)} ${formatTime(toDate)}`;
  }

  return `Until ${formatDate(toDate)} ${formatTime(toDate)}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  dismissButton: {
    padding: 4
  },
  dismissText: {
    fontSize: 18,
    color: '#666'
  },
  alertsList: {
    maxHeight: 250
  },
  alertItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderLeftWidth: 4
  },
  severity_warning: {
    borderLeftColor: '#f44336',
    backgroundColor: 'rgba(244, 67, 54, 0.05)'
  },
  severity_watch: {
    borderLeftColor: '#ff9800',
    backgroundColor: 'rgba(255, 152, 0, 0.05)'
  },
  severity_advisory: {
    borderLeftColor: '#2196f3',
    backgroundColor: 'rgba(33, 150, 243, 0.05)'
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8
  },
  alertHeaderText: {
    flex: 1
  },
  alertType: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  alertTime: {
    fontSize: 11,
    color: '#666'
  },
  alertMessage: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16
  }
});
