import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';

// Fixes EACCES permissions error by creating folders inside current project workspace
const dbDir = path.dirname(CONFIG.DATABASE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(CONFIG.DATABASE_PATH);

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
