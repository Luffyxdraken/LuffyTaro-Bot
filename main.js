import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { CONFIG } from './config.js';
import { commands } from './plugins/commands.js';
import { handleGroupParticipants } from './plugins/automation.js';

// 1. Render Health Check Server (Runs ONCE at boot)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('LuffyTaro Bot Live');
}).listen(PORT, () => {
  console.log(`📡 Render Health Check active on port ${PORT}`);
});

// 2. Session Initialization Logic (Runs ONCE at boot)
async function initSession() {
  if (CONFIG.SESSION_ID) {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    }
    const credsPath = path.join(CONFIG.SESSION_DIR, 'creds.json');
    
    try {
      const base64Data = CONFIG.SESSION_ID.includes(';;;') ? CONFIG.SESSION_ID.split(';;;')[1] : CONFIG.SESSION_ID;
      fs.writeFileSync(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'));
      console.log('✅ Fresh Session ID successfully written to persistent disk.');
    } catch (err) {
      console.error('❌ Session decoding failed:', err.message);
    }
  }
}

// 3. Core Bot Connection Process
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: !CONFIG.SESSION_ID
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && !CONFIG.SESSION_ID) QRCode.generate(qr, { small: true });
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || 'No direct message reason supplied';
      
      console.log(`📡 Socket Closed. Code: ${statusCode} | Reason: ${reason}`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Device logged out. Stop reconnecting.');
        return;
      }

      console.log('🔄 Reconnecting system in 5 seconds...');
      setTimeout(() => startBot(), 5000);

    } else if (connection === 'open') {
      console.log('✅ Bot Online.');
      try {
        const startAlert = `⚡ *LuffyTaro Bot is Active!*\n\nAll operational modules loaded. Run commands inside target management groups.`;
        await sock.sendMessage(CONFIG.OWNER, { text: startAlert });
        await commands.menu(sock, { key: { remoteJid: CONFIG.OWNER } });
      } catch (e) {
        console.log('Could not alert owner chat directly.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('group-participants.update', async (update) => {
    try { await handleGroupParticipants(sock, update); } catch (e) { console.error(e); }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!text.startsWith(CONFIG.PREFIX)) return;

    const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    let targetCmd = commandName;
    if (commandName === 'menu' || commandName === 'help') targetCmd = 'menu';

    if (commands[targetCmd]) {
      try {
        await commands[targetCmd](sock, msg, args);
      } catch (err) {
        console.error(err);
      }
    }
  });
}

// Global execution sequence
async function run() {
  await initSession(); // Sets file once
  await startBot();    // Loops inside its own reconnect handlers
}

run();
