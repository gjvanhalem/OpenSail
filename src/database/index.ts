import SQLite from 'react-native-sqlite-storage';

// Enable promise API
SQLite.enablePromise(true);

export interface Database {
  run(sql: string, params?: unknown[]): Promise<void>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export class SQLiteDatabase implements Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName = 'opensail.db';
  private dbVersion = '1.0';
  private dbDisplayName = 'OpenSail Navigation Database';
  private dbSize = 200000;

  async initialize(): Promise<void> {
    try {
      console.log('Initializing SQLite database...');
      this.db = await SQLite.openDatabase({
        name: this.dbName,
        location: 'default',
      });
      console.log('Database opened successfully');
      await this.runMigrations();
      console.log('Database migrations completed');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  private async createDatabase(): Promise<SQLite.SQLiteDatabase> {
    return SQLite.openDatabase({
      name: this.dbName,
      location: 'default',
    });
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    try {
      await this.db.executeSql(sql, params as any[]);
    } catch (error) {
      console.error('SQL execution error:', error, 'SQL:', sql);
      throw error;
    }
  }

  async get<T>(sql: string, params?: unknown[]): Promise<T | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    try {
      const [results] = await this.db.executeSql(sql, params as any[]);
      if (results.rows.length > 0) {
        return results.rows.item(0) as T;
      }
      return null;
    } catch (error) {
      console.error('SQL query error:', error, 'SQL:', sql);
      throw error;
    }
  }

  async all<T>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    try {
      const [results] = await this.db.executeSql(sql, params as any[]);
      const rows: T[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        rows.push(results.rows.item(i) as T);
      }
      return rows;
    } catch (error) {
      console.error('SQL query error:', error, 'SQL:', sql);
      throw error;
    }
  }

  async exec(sql: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    try {
      // Split multiple statements and execute them
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await this.db.executeSql(statement);
      }
    } catch (error) {
      console.error('SQL exec error:', error, 'SQL:', sql);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        console.log('Database closed successfully');
        this.db = null;
      } catch (error) {
        console.error('Error closing database:', error);
        throw error;
      }
    }
  }

  private async runMigrations(): Promise<void> {
    const migrations = [
      `CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        total_distance REAL,
        estimated_duration INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS waypoints (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL,
        position_lat REAL NOT NULL,
        position_lon REAL NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        arrival_radius REAL DEFAULT 50,
        sequence_order INTEGER NOT NULL,
        FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        distance REAL,
        max_speed REAL,
        avg_speed REAL
      )`,

      `CREATE TABLE IF NOT EXISTS track_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id TEXT NOT NULL,
        position_lat REAL NOT NULL,
        position_lon REAL NOT NULL,
        speed REAL,
        heading REAL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS idx_track_points_track_id ON track_points(track_id)`,
      `CREATE INDEX IF NOT EXISTS idx_track_points_timestamp ON track_points(timestamp)`,

      `CREATE TABLE IF NOT EXISTS voyages (
        id TEXT PRIMARY KEY,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        start_position_lat REAL,
        start_position_lon REAL,
        end_position_lat REAL,
        end_position_lon REAL,
        distance REAL,
        avg_speed REAL,
        max_speed REAL
      )`,

      `CREATE TABLE IF NOT EXISTS logbook_entries (
        id TEXT PRIMARY KEY,
        voyage_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        position_lat REAL,
        position_lon REAL,
        type TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (voyage_id) REFERENCES voyages(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS ais_targets (
        mmsi TEXT PRIMARY KEY,
        name TEXT,
        call_sign TEXT,
        position_lat REAL,
        position_lon REAL,
        course REAL,
        speed REAL,
        heading REAL,
        vessel_type INTEGER,
        length REAL,
        width REAL,
        last_update INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS ais_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mmsi TEXT NOT NULL,
        position_lat REAL NOT NULL,
        position_lon REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (mmsi) REFERENCES ais_targets(mmsi) ON DELETE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS idx_ais_history_mmsi ON ais_history(mmsi)`,
      `CREATE INDEX IF NOT EXISTS idx_ais_history_timestamp ON ais_history(timestamp)`,

      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS chart_cache (
        tile_key TEXT PRIMARY KEY,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        z INTEGER NOT NULL,
        format TEXT NOT NULL,
        cached_at INTEGER NOT NULL,
        size INTEGER NOT NULL,
        data TEXT
      )`,

      `CREATE INDEX IF NOT EXISTS idx_chart_cache_xyz ON chart_cache(x, y, z)`,
    ];

    for (const migration of migrations) {
      await this.exec(migration);
    }
  }
}

let databaseInstance: SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  if (!databaseInstance) {
    databaseInstance = new SQLiteDatabase();
    await databaseInstance.initialize();
  }
  return databaseInstance;
};

export const closeDatabase = async (): Promise<void> => {
  if (databaseInstance) {
    await databaseInstance.close();
    databaseInstance = null;
  }
};
