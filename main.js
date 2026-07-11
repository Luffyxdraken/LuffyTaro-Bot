import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';
import { commands } from './plugins/commands.js';
import { handleGroupParticipants } from './plugins/automation.js';

async function initSession() {
  if (CONFIG.SESSION_ID) {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    const credsPath = path.join(CONFIG.SESSION_DIR, 'creds.json');
    if (!fs.existsSync(credsPath)) {
      try {
        const base64Data = CONFIG.SESSION_ID.includes(';;;') ? CONFIG.SESSION_ID.split(';;;')[1] : CONFIG.SESSION_ID;
        fs.writeFileSync(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'));
        console.log('✅ Session imported.');
      } catch (err) {
        console.error('❌ Session decoding failed:', err.message);
      }
    }
  }
}

async function startBot() {
  await initSession();
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
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot Online.');
      
      // Automatically triggers owner alert menu notification upon boot sequence completion
      try {
        const startAlert = `⚡ *LuffyTaro Bot is Active!*\n\nAll operational modules loaded. Run commands inside target management groups.`;
        await sock.sendMessage(CONFIG.OWNER, { text: startAlert });
        await commands.menu(sock, { key: { remoteJid: CONFIG.OWNER } });
      } catch (e) {
        console.log('Could not alert owner chat directly, verify owner number format.');
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
    
    // Explicit tracking mapping logic
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

startBot();
