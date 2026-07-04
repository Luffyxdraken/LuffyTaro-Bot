import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';
import { loadPlugins, commands } from './lib/Handler.js';
import { getSettings } from './sql/database.js';

// Decodes Session ID and creates the creds file if it doesn't exist
async function initSession() {
  if (CONFIG.SESSION_ID) {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    }
    const credsPath = path.join(CONFIG.SESSION_DIR, 'creds.json');
    
    if (!fs.existsSync(credsPath)) {
      try {
        // Strip out prefixes if your session generator includes one (e.g., "Session;;;")
        const base64Data = CONFIG.SESSION_ID.includes(';;;') 
          ? CONFIG.SESSION_ID.split(';;;')[1] 
          : CONFIG.SESSION_ID;
          
        const decodedCreds = Buffer.from(base64Data, 'base64').toString('utf-8');
        fs.writeFileSync(credsPath, decodedCreds);
        console.log('✅ Session ID successfully authenticated and imported!');
      } catch (err) {
        console.error('❌ Invalid Session ID format:', err.message);
      }
    }
  }
}

async function startBot() {
  await loadPlugins();
  await initSession(); // Run session string processor
  
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: !CONFIG.SESSION_ID // Only print QR if no Session ID is given
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && !CONFIG.SESSION_ID) QRCode.generate(qr, { small: true });
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot successfully connected to WhatsApp via Session ID!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!text.startsWith(CONFIG.PREFIX)) return;

    const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName);

    if (command) {
      try {
        const settings = getSettings(msg.key.remoteJid);
        if (settings.antilink && text.includes('chat.whatsapp.com')) return;

        await command.function(sock, msg, args);
      } catch (err) {
        console.error(`Error executing ${commandName}:`, err);
      }
    }
  });
}

startBot();
