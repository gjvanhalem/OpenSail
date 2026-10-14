import type { InstrumentDataConnection } from './types';

/**
 * Live connection objects by id. The Redux store holds only their serialisable
 * status; the objects live here so a connection keeps running, and can still
 * be disconnected, after the page that opened it unmounts.
 */
const connections = new Map<string, InstrumentDataConnection>();

export const connectionRegistry = {
  add(connection: InstrumentDataConnection): void {
    connections.set(connection.id, connection);
  },
  get(id: string): InstrumentDataConnection | undefined {
    return connections.get(id);
  },
  remove(id: string): void {
    connections.delete(id);
  },
};
