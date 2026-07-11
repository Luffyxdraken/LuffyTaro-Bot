import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

export const CONFIG = {
  SESSION_ID: process.env.SESSION_ID || '',
  SESSION_DIR: path.join(process.cwd(), 'data', 'session'),
  DATABASE_PATH: path.join(process.cwd(), 'data', 'database.sqlite'),
  PREFIX: process.env.PREFIX || '.',
  OWNER: (process.env.OWNER_NUMBER || '917866052212') + '@s.whatsapp.net'
};
