import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { WeatherAlert } from '../types';

export interface WeatherAlertNotificationProps {
  alert: WeatherAlert | null;
  onDismiss?: () => void;
  onViewDetails?: (alert: WeatherAlert) => void;
  autoHideDuration?: number;
}

export const WeatherAlertNotification: React.FC<WeatherAlertNotificationProps> = ({
  alert,
  onDismiss,
  onViewDetails,
  autoHideDuration = 10000
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();

      if (autoHideDuration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoHideDuration);

        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
    
    return undefined;
  }, [alert]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setVisible(false);
      onDismiss?.();
    });
  };

  const handleViewDetails = () => {
    if (alert) {
      onViewDetails?.(alert);
    }
  };

  if (!visible || !alert) {
    return null;
  }

  const severityColor = getSeverityColor(alert.severity);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, backgroundColor: severityColor }
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getSeverityIcon(alert.severity)}</Text>
        
        <View style={styles.textContent}>
          <Text style={styles.type}>{alert.type}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {alert.message}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewDetails}
          >
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
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

function getSeverityColor(severity: 'warning' | 'watch' | 'advisory'): string {
  switch (severity) {
    case 'warning':
      return 'rgba(244, 67, 54, 0.95)';
    case 'watch':
      return 'rgba(255, 152, 0, 0.95)';
    case 'advisory':
      return 'rgba(33, 150, 243, 0.95)';
    default:
      return 'rgba(158, 158, 158, 0.95)';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  icon: {
    fontSize: 24,
    marginRight: 12
  },
  textContent: {
    flex: 1,
    marginRight: 8
  },
  type: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  message: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 16
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff'
  },
  dismissButton: {
    padding: 4
  },
  dismissText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold'
  }
});
