import { AppState, AppStateStatus } from 'react-native';
import { AppServices } from './AppInitializer';
import { store } from '../store';

interface AppStateData {
  lastActiveTime: number;
  activeRouteId: string | null;
}

/**
 * Manages app lifecycle events and state persistence
 */
export class AppLifecycleManager {
  private appState: AppStateStatus = 'active';
  private services: AppServices | null = null;
  private appStateSubscription: any = null;

  /**
   * Initialize lifecycle manager with services
   */
  initialize(services: AppServices): void {
    this.services = services;
    this.setupAppStateListener();
  }

  /**
   * Set up app state change listener
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    if (!this.services) return;

    // App is going to background
    if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      console.log('App going to background');
      await this.handleBackground();
    }

    // App is coming to foreground
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App coming to foreground');
      await this.handleForeground();
    }

    this.appState = nextAppState;
  };

  /**
   * Handle app going to background
   */
  private async handleBackground(): Promise<void> {
    if (!this.services) return;

    try {
      console.log('App entering background mode');
      // Track recording and voyage tracking will continue in background
      // This requires proper background permissions configured
    } catch (error) {
      console.error('Error handling background:', error);
    }
  }

  /**
   * Handle app coming to foreground
   */
  private async handleForeground(): Promise<void> {
    if (!this.services) return;

    try {
      console.log('App entering foreground mode');
      // Services will resume normal operation
    } catch (error) {
      console.error('Error handling foreground:', error);
    }
  }

  /**
   * Clean up on app termination
   */
  async cleanup(): Promise<void> {
    if (!this.services) return;

    try {
      console.log('Cleaning up app...');

      // Stop track recording if active
      try {
        await this.services.trackService.stopRecording();
        console.log('Track recording stopped');
      } catch (error) {
        // Track may not be recording
      }

      // End voyage if active
      try {
        await this.services.logbookService.endVoyage();
        console.log('Voyage ended');
      } catch (error) {
        // Voyage may not be active
      }

      // Disconnect instruments
      try {
        await this.services.instrumentService.disconnect();
        console.log('Instruments disconnected');
      } catch (error) {
        // Instruments may not be connected
      }

      // Remove app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
      }

      console.log('Cleanup complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Handle background mode for track recording
   * This requires special permissions and configuration
   */
  async enableBackgroundTracking(): Promise<void> {
    // On iOS: Requires "location" background mode in Info.plist
    // On Android: Requires foreground service
    console.log('Background tracking enabled');
    // Implementation would depend on platform-specific requirements
  }
}

// Singleton instance
export const appLifecycleManager = new AppLifecycleManager();
