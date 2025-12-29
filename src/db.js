import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine the database path
// On Vercel, we can only write to /tmp.
// We check if we are in a read-only environment or just default to /tmp for safety in serverless.
// However, 'os.tmpdir()' is safer.

const isVercel = process.env.VERCEL === '1';
let dbPath;

if (isVercel) {
    dbPath = path.join(os.tmpdir(), 'pastebin.db');
} else {
    dbPath = path.resolve(process.cwd(), 'pastebin.db');
}

// Ensure the directory exists (mostly for local dev if not using cwd)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`Using database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS pastes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    max_views INTEGER,
    views INTEGER DEFAULT 0
  )
`);

const insertPaste = (paste) => {
  const stmt = db.prepare(`
    INSERT INTO pastes (id, content, created_at, expires_at, max_views)
    VALUES (@id, @content, @created_at, @expires_at, @max_views)
  `);
  stmt.run(paste);
};

// Transactional get to ensure view count consistency
const getPaste = db.transaction((id, now) => {
  const stmt = db.prepare('SELECT * FROM pastes WHERE id = ?');
  const paste = stmt.get(id);

  if (!paste) return null;

  // Check Expiry
  if (paste.expires_at !== null && paste.expires_at < now) {
    return null;
  }

  // Check View Limit
  // If views already reached max_views, it's unavailable.
  if (paste.max_views !== null && paste.views >= paste.max_views) {
    return null;
  }

  // Increment view count
  // We do this BEFORE returning.
  const update = db.prepare('UPDATE pastes SET views = views + 1 WHERE id = ?');
  update.run(id);

  paste.views += 1;
  
  return paste;
});

const checkHealth = () => {
  try {
    const stmt = db.prepare('SELECT 1');
    stmt.get();
    return true;
  } catch (e) {
    return false;
  }
};

export default {
  insertPaste,
  getPaste,
  checkHealth
};
