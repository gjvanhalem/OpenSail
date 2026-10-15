import { db, type SafetyEvent, type SafetyEventType } from '../db';
import { BaseRepository } from './Repository';

/** Events that start or end a MOB, and those that start or end an anchor watch */
const MOB_LIFECYCLE: SafetyEventType[] = ['mob_activated', 'mob_cleared'];
const ANCHOR_LIFECYCLE: SafetyEventType[] = ['anchor_dropped', 'anchor_raised'];

export class SafetyEventRepository extends BaseRepository<SafetyEvent> {
  protected getTable() {
    return db.safetyEvents;
  }

  protected generateId(): string {
    return `safety_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /** Events of one MOB or anchor watch, oldest first */
  async getBySession(sessionId: string): Promise<SafetyEvent[]> {
    return db.safetyEvents.where('sessionId').equals(sessionId).sortBy('timestamp');
  }

  /** The newest events first, for the logbook */
  async getRecent(limit = 100): Promise<SafetyEvent[]> {
    return db.safetyEvents.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  /**
   * The events of the MOB and anchor watch that were still active when the
   * app last closed: the session's start event plus later events of it, or
   * null when the last one was ended.
   */
  async getActiveSessions(): Promise<{
    mob: SafetyEvent[] | null;
    anchor: SafetyEvent[] | null;
  }> {
    const latest = async (types: SafetyEventType[]) => {
      const event = await db.safetyEvents
        .orderBy('timestamp')
        .reverse()
        .filter((e) => types.includes(e.type))
        .first();
      if (!event || event.type === types[1]) return null;
      return this.getBySession(event.sessionId);
    };
    const [mob, anchor] = await Promise.all([latest(MOB_LIFECYCLE), latest(ANCHOR_LIFECYCLE)]);
    return { mob, anchor };
  }
}

export const safetyEventRepository = new SafetyEventRepository();
