import Database from 'better-sqlite3';
import { CONFIG } from '../config.js';

const db = new Database(CONFIG.DATABASE_PATH);

// Initialize tables with schema migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    chat_id TEXT PRIMARY KEY,
    welcome TEXT DEFAULT 'disabled',
    antilink INTEGER DEFAULT 0,
    antidelete INTEGER DEFAULT 0,
    antispam INTEGER DEFAULT 0
  );
`);

export const getSettings = (chatId) => {
  const stmt = db.prepare('SELECT * FROM settings WHERE chat_id = ?');
  return stmt.get(chatId) || { chat_id: chatId, welcome: 'disabled', antilink: 0, antidelete: 0, antispam: 0 };
};

export const updateSetting = (chatId, column, value) => {
  db.prepare(`
    INSERT INTO settings (chat_id, ${column}) 
    VALUES (?, ?) 
    ON CONFLICT(chat_id) DO UPDATE SET ${column} = ?
  `).run(chatId, value, value);
};

