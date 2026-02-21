// Mock for react-native-sqlite-storage
const mockData = new Map();

const mockDatabase = {
  executeSql: jest.fn((sql, params) => {
    const results = {
      rows: {
        length: 0,
        item: (index) => null,
        raw: () => [],
      },
      rowsAffected: 0,
      insertId: undefined,
    };

    // Handle INSERT
    if (sql.trim().toUpperCase().startsWith('INSERT')) {
      const match = sql.match(/INSERT INTO (\w+)/i);
      if (match) {
        const table = match[1];
        const key = `${table}_${params?.[0] || Math.random()}`;
        const row = {};
        
        // Parse column names from SQL
        const colMatch = sql.match(/\(([^)]+)\)/);
        if (colMatch && params) {
          const cols = colMatch[1].split(',').map(c => c.trim());
          cols.forEach((col, i) => {
            row[col] = params[i];
          });
        }
        
        mockData.set(key, { table, ...row });
        results.rowsAffected = 1;
        results.insertId = mockData.size;
      }
      return Promise.resolve([results]);
    }

    // Handle UPDATE
    if (sql.trim().toUpperCase().startsWith('UPDATE')) {
      const match = sql.match(/UPDATE (\w+)/i);
      if (match) {
        const table = match[1];
        let updated = 0;
        
        for (const [key, value] of mockData.entries()) {
          if (value.table === table) {
            // Simple update logic
            const setMatch = sql.match(/SET\s+(\w+)\s*=\s*\?/i);
            if (setMatch && params && params.length > 0) {
              value[setMatch[1]] = params[0];
              updated++;
            }
          }
        }
        
        results.rowsAffected = updated;
      }
      return Promise.resolve([results]);
    }

    // Handle DELETE
    if (sql.trim().toUpperCase().startsWith('DELETE')) {
      const match = sql.match(/DELETE FROM (\w+)/i);
      if (match) {
        const table = match[1];
        let deleted = 0;
        
        for (const [key, value] of mockData.entries()) {
          if (value.table === table) {
            mockData.delete(key);
            deleted++;
          }
        }
        
        results.rowsAffected = deleted;
      }
      return Promise.resolve([results]);
    }

    // Handle SELECT
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const match = sql.match(/FROM (\w+)/i);
      if (match) {
        const table = match[1];
        const rows = [];
        
        for (const [key, value] of mockData.entries()) {
          if (value.table === table) {
            const row = { ...value };
            delete row.table;
            
            // Simple WHERE clause handling
            if (sql.includes('WHERE') && params && params.length > 0) {
              const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
              if (whereMatch) {
                const col = whereMatch[1];
                if (row[col] === params[0]) {
                  rows.push(row);
                }
              } else if (sql.includes('IN')) {
                // Handle IN clause
                rows.push(row);
              }
            } else {
              rows.push(row);
            }
          }
        }
        
        results.rows = {
          length: rows.length,
          item: (index) => rows[index],
          raw: () => rows,
        };
      }
      return Promise.resolve([results]);
    }

    // Handle CREATE TABLE and CREATE INDEX
    if (sql.trim().toUpperCase().startsWith('CREATE')) {
      results.rowsAffected = 0;
      return Promise.resolve([results]);
    }

    return Promise.resolve([results]);
  }),
  close: jest.fn(() => {
    mockData.clear();
    return Promise.resolve();
  }),
};

const SQLite = {
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => Promise.resolve(mockDatabase)),
  DEBUG: jest.fn(),
  deleteDatabase: jest.fn(() => {
    mockData.clear();
    return Promise.resolve();
  }),
};

module.exports = SQLite;
module.exports.default = SQLite;
