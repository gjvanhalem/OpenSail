import { getDatabase } from '../database';
import { InstrumentServiceImpl } from './InstrumentService';
import { RouteServiceImpl } from './RouteService';
import { AISServiceImpl } from './AISService';
import { TrackServiceImpl } from './TrackService';
import { LogbookServiceImpl } from './LogbookService';
import { SafetyServiceImpl } from './SafetyService';
import { SettingsServiceImpl } from './SettingsService';
import { WeatherServiceImpl } from './WeatherService';
import { TideServiceImpl } from './TideService';
import { ChartManagerImpl } from './ChartManager';
import { SyncManager } from './SyncManager';
import { ErrorHandlerImpl } from './ErrorHandler';
import { store } from '../store';
import { InstrumentDataType } from '../types';

export interface AppServices {
  instrumentService: InstrumentServiceImpl;
  routeService: RouteServiceImpl;
  aisService: AISServiceImpl;
  trackService: TrackServiceImpl;
  logbookService: LogbookServiceImpl;
  safetyService: SafetyServiceImpl;
  settingsService: SettingsServiceImpl;
  weatherService: WeatherServiceImpl;
  tideService: TideServiceImpl;
  chartManager: ChartManagerImpl;
  syncManager: SyncManager;
  errorHandler: ErrorHandlerImpl;
}

export interface InitializationProgress {
  stage: string;
  progress: number;
  message: string;
}

export type InitializationCallback = (progress: InitializationProgress) => void;

/**
 * Handles application initialization and service setup
 */
export class AppInitializer {
  private services: AppServices | null = null;
  private initialized = false;

  /**
   * Initialize the application with all services
   */
  async initialize(onProgress?: InitializationCallback): Promise<AppServices> {
    if (this.initialized && this.services) {
      return this.services;
    }

    try {
      // Stage 1: Initialize database
      this.reportProgress(onProgress, 'database', 10, 'Initializing database...');
      await getDatabase();

      // Stage 2: Create error handler first
      this.reportProgress(onProgress, 'error-handler', 15, 'Setting up error handling...');
      const errorHandler = new ErrorHandlerImpl();

      // Stage 3: Create settings service
      this.reportProgress(onProgress, 'settings', 20, 'Loading settings...');
      const settingsService = new SettingsServiceImpl();
      await settingsService.initialize();

      // Stage 4: Create sync manager
      this.reportProgress(onProgress, 'sync', 25, 'Initializing sync manager...');
      const syncManager = new SyncManager();

      // Stage 5: Create chart manager
      this.reportProgress(onProgress, 'charts', 35, 'Loading charts...');
      const chartManager = new ChartManagerImpl();

      // Stage 6: Create instrument service
      this.reportProgress(onProgress, 'instruments', 45, 'Connecting to instruments...');
      const instrumentService = new InstrumentServiceImpl();
      instrumentService.setStore(store);

      // Stage 7: Create route service
      this.reportProgress(onProgress, 'routes', 55, 'Loading routes...');
      const routeService = new RouteServiceImpl();
      routeService.setStore(store);

      // Stage 8: Create AIS service
      this.reportProgress(onProgress, 'ais', 60, 'Initializing AIS...');
      const aisService = new AISServiceImpl();
      aisService.setStore(store);

      // Stage 9: Create track service
      this.reportProgress(onProgress, 'tracks', 65, 'Loading tracks...');
      const trackService = new TrackServiceImpl();

      // Stage 10: Create logbook service
      this.reportProgress(onProgress, 'logbook', 70, 'Loading logbook...');
      const logbookService = new LogbookServiceImpl();

      // Stage 11: Create safety service
      this.reportProgress(onProgress, 'safety', 75, 'Initializing safety features...');
      const safetyService = new SafetyServiceImpl();

      // Stage 12: Create weather service
      this.reportProgress(onProgress, 'weather', 80, 'Loading weather data...');
      const weatherService = new WeatherServiceImpl();

      // Stage 13: Create tide service
      this.reportProgress(onProgress, 'tides', 85, 'Loading tide data...');
      const tideService = new TideServiceImpl();

      // Stage 14: Connect services
      this.reportProgress(onProgress, 'connect', 90, 'Connecting services...');
      
      // Connect instrument service to AIS service
      instrumentService.subscribe(InstrumentDataType.AIS, (data) => {
        // AIS service will process AIS messages from instrument data
        aisService.processMessage(data.value);
      });

      // Stage 15: Start auto-connect in stub mode for testing
      this.reportProgress(onProgress, 'autoconnect', 95, 'Auto-connecting instruments...');
      try {
        // Try to connect in stub mode by default for testing
        await instrumentService.connect({
          protocol: 'nmea0183',
          connection: { type: 'serial', port: 'COM1' },
          useStub: true,
        });
      } catch (error) {
        console.warn('Auto-connect failed:', error);
        // Continue initialization even if auto-connect fails
      }

      // Stage 16: Complete
      this.reportProgress(onProgress, 'complete', 100, 'Ready');

      this.services = {
        instrumentService,
        routeService,
        aisService,
        trackService,
        logbookService,
        safetyService,
        settingsService,
        weatherService,
        tideService,
        chartManager,
        syncManager,
        errorHandler,
      };

      this.initialized = true;
      return this.services;
    } catch (error) {
      this.reportProgress(onProgress, 'error', 0, `Initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get initialized services
   */
  getServices(): AppServices | null {
    return this.services;
  }

  /**
   * Check if app is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    if (!this.services) return;

    try {
      // Disconnect instrument service
      await this.services.instrumentService.disconnect();

      // Stop track recording if active
      await this.services.trackService.stopRecording();

      // End voyage if active
      await this.services.logbookService.endVoyage();

      this.services = null;
      this.initialized = false;
    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  private reportProgress(
    callback: InitializationCallback | undefined,
    stage: string,
    progress: number,
    message: string
  ): void {
    if (callback) {
      callback({ stage, progress, message });
    }
  }
}

// Singleton instance
export const appInitializer = new AppInitializer();
