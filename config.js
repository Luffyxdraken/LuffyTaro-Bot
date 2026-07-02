import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    prefix: process.env.PREFIX || '.',
    ownerNumber: process.env.OWNER_NUMBER || '917866052212',
    ownerName: process.env.OWNER_NAME || 'Luffy',
    botName: process.env.BOT_NAME || 'LuffyTaro Bot',
    authType: process.env.AUTH_TYPE || 'pairing', // 'pairing' or 'qr'
    sessionDir: path.resolve(__dirname, process.env.SESSION_DIR || './sessions'),
    databasePath: path.resolve(__dirname, process.env.DATABASE_PATH || './database/luffytaro.db'),
    autoRead: process.env.AUTO_READ === 'true',
    autoTyping: process.env.AUTO_TYPING === 'true',
    autoRecording: process.env.AUTO_RECORDING === 'true',
    mode: process.env.MODE || 'public', // 'public' or 'private'
    version: '1.0.0'
};
