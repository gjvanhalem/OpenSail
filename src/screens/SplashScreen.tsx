import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { InitializationProgress } from '../services/AppInitializer';

interface SplashScreenProps {
  progress: InitializationProgress;
}

/**
 * Splash screen displayed during app initialization
 */
const SplashScreen: React.FC<SplashScreenProps> = ({ progress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Title */}
        <Text style={styles.logo}>⚓</Text>
        <Text style={styles.title}>OpenSail</Text>
        <Text style={styles.subtitle}>Marine Navigation System</Text>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{progress.message}</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${progress.progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{progress.progress}%</Text>
        </View>
      </View>

      {/* Version Info */}
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#90caf9',
    marginBottom: 60,
  },
  loadingContainer: {
    alignItems: 'center',
    minWidth: 280,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#90caf9',
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#1e3a5f',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64b5f6',
  },
  version: {
    position: 'absolute',
    bottom: 24,
    fontSize: 12,
    color: '#546e7a',
  },
});

export default SplashScreen;
