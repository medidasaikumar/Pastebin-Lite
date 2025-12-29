// import Database from 'better-sqlite3';
// import path from 'path';
// import fs from 'fs';
// import os from 'os';

// let adapter;

// try {
   
//   const isVercel = process.env.VERCEL === '1';
//   let dbPath;

//   if (isVercel) {
//       dbPath = path.join(os.tmpdir(), 'pastebin.db');
//   } else {
//       dbPath = path.resolve(process.cwd(), 'pastebin.db');
//   }

   
//   const dbDir = path.dirname(dbPath);
//   if (!fs.existsSync(dbDir)) {
//       fs.mkdirSync(dbDir, { recursive: true });
//   }

//   console.log(`Attempting to use SQLite at: ${dbPath}`);
  
   
//   const db = new Database(dbPath);
//   db.pragma('journal_mode = WAL');

//   // Create table if not exists
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS pastes (
//       id TEXT PRIMARY KEY,
//       content TEXT NOT NULL,
//       created_at INTEGER NOT NULL,
//       expires_at INTEGER,
//       max_views INTEGER,
//       views INTEGER DEFAULT 0
//     )
//   `);

//   adapter = {
//     insertPaste: (paste) => {
//       const stmt = db.prepare(`
//         INSERT INTO pastes (id, content, created_at, expires_at, max_views)
//         VALUES (@id, @content, @created_at, @expires_at, @max_views)
//       `);
//       stmt.run(paste);
//     },
//     getPaste: db.transaction((id, now) => {
//       const stmt = db.prepare('SELECT * FROM pastes WHERE id = ?');
//       const paste = stmt.get(id);

//       if (!paste) return null;

//       // Check Expiry
//       if (paste.expires_at !== null && paste.expires_at < now) {
//         return null;
//       }

//       // Check View Limit
//       if (paste.max_views !== null && paste.views >= paste.max_views) {
//         return null;
//       }

//       // Increment view count
//       const update = db.prepare('UPDATE pastes SET views = views + 1 WHERE id = ?');
//       update.run(id);

//       paste.views += 1;
      
//       return paste;
//     }),
//     checkHealth: () => {
//       try {
//         const stmt = db.prepare('SELECT 1');
//         stmt.get();
//         return true;
//       } catch (e) {
//         return false;
//       }
//     }
//   };
  
//   console.log('SQLite adapter initialized successfully.');

// } catch (error) {
//   console.error('Failed to initialize SQLite. Falling back to In-Memory Store.', error);
//   console.error('This is likely due to Vercel environment constraints with native modules.');
  
   
//   const memoryStore = new Map();

//   adapter = {
//     insertPaste: (paste) => {
//       // Ensure views is set to 0 if not provided
//       const newPaste = { ...paste, views: 0 };
//       memoryStore.set(paste.id, newPaste);
//     },
//     getPaste: (id, now) => {
//       const paste = memoryStore.get(id);
//       if (!paste) return null;

//       // Check Expiry
//       if (paste.expires_at !== null && paste.expires_at < now) {
//         return null;
//       }

//       // Check View Limit
//       if (paste.max_views !== null && paste.views >= paste.max_views) {
//         return null;
//       }

       
//       paste.views += 1;
//       return { ...paste }; 
//     },
//     checkHealth: () => true
//   };
// }

// export default adapter;
import path from 'path';
import fs from 'fs';
import os from 'os';

let adapter;

// Detect Vercel
const isVercel = process.env.VERCEL === '1';

try {
  // 🚫 NEVER load SQLite on Vercel
  if (isVercel) {
    throw new Error('SQLite disabled on Vercel');
  }

  // ✅ Dynamic import (SAFE)
  const Database = (await import('better-sqlite3')).default;

  const dbPath = path.resolve(process.cwd(), 'pastebin.db');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`Using SQLite at: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

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

  adapter = {
    insertPaste: (paste) => {
      db.prepare(`
        INSERT INTO pastes (id, content, created_at, expires_at, max_views)
        VALUES (@id, @content, @created_at, @expires_at, @max_views)
      `).run(paste);
    },

    getPaste: db.transaction((id, now) => {
      const paste = db.prepare(
        'SELECT * FROM pastes WHERE id = ?'
      ).get(id);

      if (!paste) return null;
      if (paste.expires_at && paste.expires_at < now) return null;
      if (paste.max_views && paste.views >= paste.max_views) return null;

      db.prepare(
        'UPDATE pastes SET views = views + 1 WHERE id = ?'
      ).run(id);

      paste.views++;
      return paste;
    }),

    checkHealth: () => true
  };

  console.log('SQLite adapter initialized');

} catch (err) {
  console.warn('Using in-memory store:', err.message);

  // ✅ MEMORY STORE (Vercel-safe)
  const store = new Map();

  adapter = {
    insertPaste: (paste) => {
      store.set(paste.id, { ...paste, views: 0 });
    },

    getPaste: (id, now) => {
      const paste = store.get(id);
      if (!paste) return null;
      if (paste.expires_at && paste.expires_at < now) return null;
      if (paste.max_views && paste.views >= paste.max_views) return null;

      paste.views++;
      return { ...paste };
    },

    checkHealth: () => true
  };
}

export default adapter;

