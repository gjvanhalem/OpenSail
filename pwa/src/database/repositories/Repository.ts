import type { Table, UpdateSpec } from 'dexie';

// Generic repository interface for CRUD operations
export interface Repository<T, K = string> {
  getAll(): Promise<T[]>;
  getById(id: K): Promise<T | undefined>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: K, item: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
  count(): Promise<number>;
}

// Base repository implementation
export abstract class BaseRepository<T extends { id?: K }, K = string> implements Repository<T, K> {
  protected abstract getTable(): Table<T, K>;
  protected abstract generateId(): K;

  async getAll(): Promise<T[]> {
    return await this.getTable().toArray();
  }

  async getById(id: K): Promise<T | undefined> {
    return await this.getTable().get(id);
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    const id = this.generateId();
    const newItem = { ...item, id } as T;
    await this.getTable().add(newItem);
    return newItem;
  }

  async update(id: K, item: Partial<T>): Promise<T> {
    // Partial<T> is structurally an UpdateSpec<T>; TS cannot prove it for an unresolved generic T
    await this.getTable().update(id, item as UpdateSpec<T>);
    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Item with id ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: K): Promise<void> {
    await this.getTable().delete(id);
  }

  async count(): Promise<number> {
    return await this.getTable().count();
  }
}
