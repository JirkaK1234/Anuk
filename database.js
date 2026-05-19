const fs = require('fs');
const path = require('path');
let Database = null;
try {
  // better-sqlite3 je nativní modul (C++). Když se změní verze Node,
  // může být binárka zkompilovaná pro jiný NODE_MODULE_VERSION a pak to spadne.
  Database = require('better-sqlite3');
} catch (err) {
  console.warn('[database] better-sqlite3 nelze načíst, přepínám na JSON fallback.', err?.message || err);
  Database = null;
}

const clone = (value) => JSON.parse(JSON.stringify(value));

const createJsonFallbackDatabase = (baseDir, dbPath) => {
  const resolveDocPath = (filePathOrName) => {
    const name = path.basename(String(filePathOrName || '')).replace(/\.json$/i, '');
    if (path.isAbsolute(String(filePathOrName || ''))) return String(filePathOrName);
    return path.join(baseDir, `${name}.json`);
  };

  const loadDocument = (filePathOrName, fallback = []) => {
    const filePath = resolveDocPath(filePathOrName);
    try {
      if (!fs.existsSync(filePath)) return clone(fallback);
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw || JSON.stringify(fallback));
    } catch (err) {
      console.warn(`[database] Nepodařilo se načíst JSON dokument ${filePath}:`, err?.message || err);
      return clone(fallback);
    }
  };

  const saveDocument = (filePathOrName, data) => {
    const filePath = resolveDocPath(filePathOrName);
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[database] Nepodařilo se uložit JSON dokument ${filePath}:`, err?.message || err);
    }
  };

  const createSessionStore = (session) => new session.MemoryStore();

  return {
    dbPath,
    loadDocument,
    saveDocument,
    createSessionStore,
    usingFallback: true
  };
};

const resolveDatabasePath = (baseDir) => {
  const configuredPath = String(process.env.DATABASE_PATH || '').trim();
  if (configuredPath) {
    return path.isAbsolute(configuredPath) ? configuredPath : path.join(baseDir, configuredPath);
  }
  return path.join(baseDir, '.data', 'anuk.sqlite');
};

const copyIfExists = (source, target) => {
  if (!fs.existsSync(source) || fs.existsSync(target)) return;
  fs.copyFileSync(source, target);
};

const migrateRootDatabaseIfNeeded = (baseDir, dbPath) => {
  const legacyPath = path.join(baseDir, 'anuk.sqlite');
  if (path.resolve(dbPath) === path.resolve(legacyPath)) return;
  if (!fs.existsSync(legacyPath) || fs.existsSync(dbPath)) return;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  copyIfExists(legacyPath, dbPath);
  copyIfExists(`${legacyPath}-wal`, `${dbPath}-wal`);
  copyIfExists(`${legacyPath}-shm`, `${dbPath}-shm`);
};

const createDatabase = (baseDir) => {
  const dbPath = resolveDatabasePath(baseDir);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  migrateRootDatabaseIfNeeded(baseDir, dbPath);
  if (!Database) {
    return createJsonFallbackDatabase(baseDir, dbPath);
  }

  let db;
  try {
    db = new Database(dbPath);
  } catch (err) {
    // Někdy require projde, ale selže až při otevření DB (bindings).
    console.warn('[database] SQLite inicializace selhala, přepínám na JSON fallback.', err?.message || err);
    return createJsonFallbackDatabase(baseDir, dbPath);
  }
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_documents (
      name TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  const getDocumentStmt = db.prepare('SELECT json FROM app_documents WHERE name = ?');
  const saveDocumentStmt = db.prepare(`
    INSERT INTO app_documents (name, json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      json = excluded.json,
      updated_at = excluded.updated_at
  `);

  const normalizeDocumentName = (filePathOrName) => path.basename(String(filePathOrName || '')).replace(/\.json$/i, '');

  const readLegacyJson = (filePath, fallback) => {
    if (!fs.existsSync(filePath)) return clone(fallback);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw || JSON.stringify(fallback));
    } catch (err) {
      console.warn(`Nepodařilo se načíst legacy JSON ${filePath}:`, err.message);
      return clone(fallback);
    }
  };

  const ensureDocument = (filePathOrName, fallback) => {
    const name = normalizeDocumentName(filePathOrName);
    const existing = getDocumentStmt.get(name);
    if (existing) return;
    const sourcePath = path.isAbsolute(String(filePathOrName))
      ? String(filePathOrName)
      : path.join(baseDir, `${name}.json`);
    const initialData = readLegacyJson(sourcePath, fallback);
    saveDocumentStmt.run(name, JSON.stringify(initialData), new Date().toISOString());
  };

  const loadDocument = (filePathOrName, fallback = []) => {
    const name = normalizeDocumentName(filePathOrName);
    ensureDocument(filePathOrName, fallback);
    const row = getDocumentStmt.get(name);
    if (!row) return clone(fallback);
    try {
      return JSON.parse(row.json);
    } catch (err) {
      console.warn(`Poškozený JSON dokument v SQLite: ${name}`, err.message);
      return clone(fallback);
    }
  };

  const saveDocument = (filePathOrName, data) => {
    const name = normalizeDocumentName(filePathOrName);
    saveDocumentStmt.run(name, JSON.stringify(data), new Date().toISOString());
  };

  const createSessionStore = (session) => {
    const Store = session.Store;
    const getSession = db.prepare('SELECT json, expires_at FROM sessions WHERE sid = ?');
    const setSession = db.prepare(`
      INSERT INTO sessions (sid, json, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET
        json = excluded.json,
        expires_at = excluded.expires_at
    `);
    const deleteSession = db.prepare('DELETE FROM sessions WHERE sid = ?');
    const deleteExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

    return new (class SQLiteSessionStore extends Store {
      get(sid, callback) {
        try {
          deleteExpired.run(Date.now());
          const row = getSession.get(sid);
          if (!row || Number(row.expires_at) <= Date.now()) return callback(null, null);
          return callback(null, JSON.parse(row.json));
        } catch (err) {
          return callback(err);
        }
      }

      set(sid, sess, callback = () => {}) {
        try {
          const expiresAt = sess?.cookie?.expires
            ? Number(new Date(sess.cookie.expires))
            : Date.now() + 7 * 24 * 60 * 60 * 1000;
          setSession.run(sid, JSON.stringify(sess), expiresAt);
          return callback(null);
        } catch (err) {
          return callback(err);
        }
      }

      destroy(sid, callback = () => {}) {
        try {
          deleteSession.run(sid);
          return callback(null);
        } catch (err) {
          return callback(err);
        }
      }

      touch(sid, sess, callback = () => {}) {
        return this.set(sid, sess, callback);
      }
    })();
  };

  return {
    dbPath,
    loadDocument,
    saveDocument,
    createSessionStore
  };
};

module.exports = { createDatabase };
