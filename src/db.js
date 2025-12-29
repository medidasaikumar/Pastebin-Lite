const Database = require('better-sqlite3');
const path = require('path');

 
const dbPath = path.resolve(process.cwd(), 'pastebin.db');
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

module.exports = {
  insertPaste,
  getPaste,
  checkHealth
};
