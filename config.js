import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  SESSION_ID: process.env.SESSION_ID || '',
  SESSION_DIR: '/data/session',
  DATABASE_PATH: '/data/database.sqlite',
  PREFIX: process.env.PREFIX || '.',
  OWNER: (process.env.OWNER_NUMBER || '917866052212') + '@s.whatsapp.net'
};
