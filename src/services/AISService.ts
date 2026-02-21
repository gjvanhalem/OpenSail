import { Subject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '@reduxjs/toolkit';
import {
  AISService,
  AISTarget,
  CPAInfo,
  GeoBounds,
  InstrumentData,
  InstrumentDataType,
  Position,
  Subscription
} from '../types';
import { AISRepository } from '../database/AISRepository';
import {
  updateTarget,
  setNearbyTargets,
  cleanupExpiredTargets,
  setError,
} from '../store/slices/aisSlice';

export class AISServiceImpl implements AISService {
  private aisRepo = new AISRepository();
  private targetSubject = new Subject<AISTarget>();
  private warningSubject = new Subject<{ target: AISTarget; cpa: CPAInfo }>();
  private readonly CPA_DISTANCE_THRESHOLD = 2;
  private ownPosition: Position | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private store: Store | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  setStore(store: Store): void {
    this.store = store;
  }

  async processMessage(message: InstrumentData | unknown): Promise<void> {
    const data = message as InstrumentData;
    if (data.type !== InstrumentDataType.AIS) return;

    const aisData = data.value as {
      mmsi?: string;
      name?: string;
      payload?: string;
    };

    if (!aisData || !aisData.mmsi) return;

    try {
      const target = this.decodeAISMessage(aisData);
      if (!target) return;

      target.lastUpdate = new Date();

      const existingTarget = await this.aisRepo.getTarget(target.mmsi);
      if (existingTarget) {
        target.history = existingTarget.history;
      }

      await this.aisRepo.upsertTarget(target);

      // Dispatch to Redux
      if (this.store) {
        this.store.dispatch(updateTarget(target));
      }

      this.targetSubject.next(target);

      if (this.ownPosition) {
        await this.checkCollision(target);
      }
    } catch (error) {
      if (this.store) {
        this.store.dispatch(setError(error instanceof Error ? error.message : 'Failed to process AIS message'));
      }
    }
  }

  async getTargets(bounds?: GeoBounds): Promise<AISTarget[]> {
    return this.aisRepo.getTargets(bounds);
  }

  async getTarget(mmsi: string): Promise<AISTarget | null> {
    return this.aisRepo.getTarget(mmsi);
  }

  subscribe(callback: (target: AISTarget) => void): Subscription {
    const subscriber = {
      next: callback
    };

    const subscription = this.targetSubject.subscribe(subscriber);

    return {
      unsubscribe: () => subscription.unsubscribe()
    };
  }

  subscribeToWarnings(
    callback: (warning: { target: AISTarget; cpa: CPAInfo }) => void
  ): Subscription {
    const subscription = this.warningSubject.subscribe(callback);

    return {
      unsubscribe: () => subscription.unsubscribe()
    };
  }

  setOwnPosition(position: Position): void {
    this.ownPosition = position;
  }

  async calculateCPA(target: AISTarget, ownPosition: Position): Promise<CPAInfo> {
    const result = await this.aisRepo.calculateCPA(target, ownPosition);

    return {
      distance: result.distance,
      time: result.time,
      position: result.position
    };
  }

  private async checkCollision(target: AISTarget): Promise<void> {
    if (!this.ownPosition) return;

    const result = await this.aisRepo.calculateCPA(target, this.ownPosition);

    if (result.distance <= this.CPA_DISTANCE_THRESHOLD) {
      const cpaInfo: CPAInfo = {
        distance: result.distance,
        time: result.time,
        position: result.position
      };

      // Update target with CPA info
      target.cpa = cpaInfo;

      if (this.store) {
        this.store.dispatch(updateTarget(target));
      }

      this.warningSubject.next({
        target,
        cpa: cpaInfo
      });
    }
  }

  private decodeAISMessage(data: {
    mmsi?: string;
    name?: string;
    payload?: string;
  }): AISTarget | null {
    if (!data.mmsi) return null;

    const target: AISTarget = {
      mmsi: data.mmsi,
      name: data.name || '',
      callSign: '',
      position: {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        timestamp: Date.now()
      },
      course: 0,
      speed: 0,
      heading: 0,
      vesselType: 0,
      length: 0,
      width: 0,
      lastUpdate: new Date(),
      history: []
    };

    if (typeof data === 'object' && 'latitude' in data) {
      const posData = data as { latitude: number; longitude: number };
      target.position.latitude = posData.latitude;
      target.position.longitude = posData.longitude;
    }

    if (typeof data === 'object' && 'course' in data) {
      target.course = (data as { course: number }).course;
    }

    if (typeof data === 'object' && 'speed' in data) {
      target.speed = (data as { speed: number }).speed;
    }

    return target;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(
      () => {
        const expirationTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
        this.aisRepo.cleanupExpiredTargets();

        // Dispatch cleanup to Redux
        if (this.store) {
          this.store.dispatch(cleanupExpiredTargets(expirationTime));
        }
      },
      60 * 60 * 1000
    );
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const createAISService = (): AISService => {
  return new AISServiceImpl();
};
