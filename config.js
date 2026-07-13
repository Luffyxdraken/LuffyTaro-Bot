import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

export const CONFIG = {
  SESSION_ID: process.env.SESSION_ID || '',
  SESSION_DIR: path.join(process.cwd(), 'data', 'session'),
  DATABASE_PATH: path.join(process.cwd(), 'data', 'database.sqlite'),
  PREFIX: '.',
  
  // 👑 MASTER OWNER ACCOUNT
  OWNER: '917866052212@s.whatsapp.net',

  // 🔗 CODES & STRINGS
  MAIN_GROUP_JID: '120363198374920134@g.us', 
  MAIN_GROUP_INVITE_LINK: 'https://chat.whatsapp.com/FzIxR7J8W1W8BB0z90ectp'
};
