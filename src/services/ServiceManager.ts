import { Store } from '@reduxjs/toolkit';
import { InstrumentServiceImpl } from './InstrumentService';
import { RouteServiceImpl } from './RouteService';
import { AISServiceImpl } from './AISService';

export class ServiceManager {
  private static instance: ServiceManager | null = null;

  private instrumentService: InstrumentServiceImpl;
  private routeService: RouteServiceImpl;
  private aisService: AISServiceImpl;

  private constructor() {
    this.instrumentService = new InstrumentServiceImpl();
    this.routeService = new RouteServiceImpl();
    this.aisService = new AISServiceImpl();
  }

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  initializeWithStore(store: Store): void {
    this.instrumentService.setStore(store);
    this.routeService.setStore(store);
    this.aisService.setStore(store);
  }

  getInstrumentService(): InstrumentServiceImpl {
    return this.instrumentService;
  }

  getRouteService(): RouteServiceImpl {
    return this.routeService;
  }

  getAISService(): AISServiceImpl {
    return this.aisService;
  }
}

export const serviceManager = ServiceManager.getInstance();
