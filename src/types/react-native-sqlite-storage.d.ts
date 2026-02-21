declare module 'react-native-sqlite-storage' {
  export interface DatabaseParams {
    name: string;
    location?: string;
  }

  export interface Transaction {
    executeSql(
      sql: string,
      params?: any[],
      success?: (tx: Transaction, results: ResultSet) => void,
      error?: (tx: Transaction, error: Error) => void
    ): void;
  }

  export interface ResultSet {
    insertId?: number;
    rowsAffected: number;
    rows: {
      length: number;
      item(index: number): any;
      raw(): any[];
    };
  }

  export interface SQLiteDatabase {
    transaction(
      fn: (tx: Transaction) => void,
      error?: (error: Error) => void,
      success?: () => void
    ): void;
    executeSql(
      sql: string,
      params?: any[],
      success?: (results: ResultSet) => void,
      error?: (error: Error) => void
    ): Promise<[ResultSet]>;
    close(
      success?: () => void,
      error?: (error: Error) => void
    ): void;
  }

  export interface SQLiteFactory {
    DEBUG(debug: boolean): void;
    enablePromise(enable: boolean): void;
    openDatabase(
      params: DatabaseParams,
      success?: (db: SQLiteDatabase) => void,
      error?: (error: Error) => void
    ): Promise<SQLiteDatabase>;
    deleteDatabase(
      params: DatabaseParams,
      success?: () => void,
      error?: (error: Error) => void
    ): Promise<void>;
  }

  namespace SQLite {
    export type { SQLiteDatabase, Transaction, ResultSet, DatabaseParams };
  }

  const SQLite: SQLiteFactory;
  export default SQLite;
}
