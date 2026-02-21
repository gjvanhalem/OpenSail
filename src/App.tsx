import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Alert } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './store';
import MainNavigationScreen from './screens/MainNavigationScreen';
import SplashScreen from './screens/SplashScreen';
import { ToastContainer } from './components/Toast';
import { appInitializer, InitializationProgress, AppServices } from './services/AppInitializer';
import { appLifecycleManager } from './services/AppLifecycleManager';

function App(): React.JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initProgress, setInitProgress] = useState<InitializationProgress>({
    stage: 'starting',
    progress: 0,
    message: 'Starting application...',
  });
  const [services, setServices] = useState<AppServices | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        const appServices = await appInitializer.initialize((progress) => {
          if (mounted) {
            setInitProgress(progress);
          }
        });

        if (mounted) {
          setServices(appServices);
          
          // Initialize lifecycle manager
          appLifecycleManager.initialize(appServices);
          
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('App initialization failed:', error);
        if (mounted) {
          Alert.alert(
            'Initialization Error',
            `Failed to initialize application: ${error}`,
            [
              {
                text: 'Retry',
                onPress: () => {
                  setIsInitialized(false);
                  initializeApp();
                },
              },
              {
                text: 'Exit',
                style: 'cancel',
              },
            ]
          );
        }
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      mounted = false;
      appLifecycleManager.cleanup();
      appInitializer.cleanup();
    };
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isInitialized ? 'dark-content' : 'light-content'} />
        {isInitialized ? (
          <MainNavigationScreen />
        ) : (
          <SplashScreen progress={initProgress} />
        )}
        <ToastContainer />
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;
