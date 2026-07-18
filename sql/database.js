import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.js';

// 🛡️ Safe fallback path extraction for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚡ Resolve database path safely (falls back to local project folder if config is missing)
const targetDbPath = CONFIG.DATABASE_PATH || path.join(__dirname, '../data/bot_database.db');
const dbDir = path.dirname(targetDbPath);

// Ensure the directory exists to avoid write access permissions errors
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize the SQLite Connection engine
const db = new Database(targetDbPath);
console.log(`📦 Database loaded safely at target path: ${targetDbPath}`);

// Initialize schemas
db.exec(`
  CREATE TABLE IF NOT EXISTS group_configs (
    chat_id TEXT PRIMARY KEY,
    welcome_type TEXT DEFAULT 'off',
    goodbye_type TEXT DEFAULT 'off'
  );
`);

export const getConfig = (chatId) => {
  const stmt = db.prepare('SELECT * FROM group_configs WHERE chat_id = ?');
  return stmt.get(chatId) || { chat_id: chatId, welcome_type: 'off', goodbye_type: 'off' };
};

export const updateConfig = (chatId, column, value) => {
  db.prepare(`
    INSERT INTO group_configs (chat_id, ${column}) 
    VALUES (?, ?) 
    ON CONFLICT(chat_id) DO UPDATE SET ${column} = ?
  `).run(chatId, value, value);
};
