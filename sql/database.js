import Database from 'better-sqlite3';
import { CONFIG } from '../config.js';

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

