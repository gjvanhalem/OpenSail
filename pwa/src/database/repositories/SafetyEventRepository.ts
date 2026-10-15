import { db, type SafetyEvent, type SafetyEventType } from '../db';
import { BaseRepository } from './Repository';

/** Events that start or end a MOB, and those that start or end an anchor watch */
const MOB_LIFECYCLE: SafetyEventType[] = ['mob_activated', 'mob_cleared'];
const ANCHOR_LIFECYCLE: SafetyEventType[] = ['anchor_dropped', 'anchor_raised'];

/** Counts ids handed out, so events in the same millisecond keep their order */
let sequence = 0;

/**
 * Oldest first. Events logged in the same millisecond (dropping the anchor
 * and changing its radius, say) have equal time stamps, so the id, which
 * follows the order the events were logged in, breaks the tie.
 */
export function compareSafetyEvents(a: SafetyEvent, b: SafetyEvent): number {
  const byTime = a.timestamp.getTime() - b.timestamp.getTime();
  if (byTime !== 0) return byTime;
  return (a.id ?? '') < (b.id ?? '') ? -1 : (a.id ?? '') > (b.id ?? '') ? 1 : 0;
}

export class SafetyEventRepository extends BaseRepository<SafetyEvent> {
  protected getTable() {
    return db.safetyEvents;
  }

  /** Sorts in the order of logging: the time, then a zero-padded sequence number */
  protected generateId(): string {
    sequence += 1;
    return `safety_${String(Date.now()).padStart(15, '0')}_${String(sequence).padStart(9, '0')}`;
  }

  /** Events of one MOB or anchor watch, oldest first */
  async getBySession(sessionId: string): Promise<SafetyEvent[]> {
    const events = await db.safetyEvents.where('sessionId').equals(sessionId).toArray();
    return events.sort(compareSafetyEvents);
  }

  /** The newest events first, for the logbook */
  async getRecent(limit = 100): Promise<SafetyEvent[]> {
    const events = await db.safetyEvents.orderBy('timestamp').reverse().limit(limit).toArray();
    return events.sort((a, b) => compareSafetyEvents(b, a));
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
      const lifecycle = await db.safetyEvents.where('type').anyOf(types).toArray();
      const event = lifecycle.sort(compareSafetyEvents).at(-1);
      if (!event || event.type === types[1]) return null;
      return this.getBySession(event.sessionId);
    };
    const [mob, anchor] = await Promise.all([latest(MOB_LIFECYCLE), latest(ANCHOR_LIFECYCLE)]);
    return { mob, anchor };
  }
}

export const safetyEventRepository = new SafetyEventRepository();
