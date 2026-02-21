import { store } from './index';
import { serviceManager } from '../services/ServiceManager';

/**
 * Initialize the Redux store and connect services
 * This should be called once at application startup
 */
export function initializeStore(): typeof store {
  // Connect services to the Redux store
  serviceManager.initializeWithStore(store);

  return store;
}

/**
 * Get the initialized store instance
 */
export function getStore(): typeof store {
  return store;
}

/**
 * Get service instances
 */
export function getServices() {
  return {
    instrumentService: serviceManager.getInstrumentService(),
    routeService: serviceManager.getRouteService(),
    aisService: serviceManager.getAISService(),
  };
}
