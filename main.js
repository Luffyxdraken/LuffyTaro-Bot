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

  // 1. CHAT MESSAGE INGESTION ROUTER
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

  // 2. DISCORD-STYLE BACKGROUND AUTOMATION GATEWAY
  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    
    try {
      // Pull targeted group tracking rules directly from your sql engine
      const settings = getSettings(id);
      
      for (let user of participants) {
        const cleanUserTag = `@${user.split('@')[0]}`;

        // Automated Entrance Alert
        if (action === 'add' && settings.welcome === 'true') {
          const welcomeMessage = `📥 **[NEW MEMBER]** 📥\n\nWelcome ${cleanUserTag} to our server layout!\n━━━━━━━━━━━━━━━━━━━━\n💬 Check the pins and enjoy your stay!`;
          await sock.sendMessage(id, { text: welcomeMessage, mentions: [user] });
        }

        // Automated Exit Alert
        if (action === 'remove' && settings.goodbye === 'true') {
          const goodbyeMessage = `📤 **[USER EXIT]** 📤\n\n${cleanUserTag} just left the server architecture. \n━━━━━━━━━━━━━━━━━━━━\n*Press F to pay respects.*`;
          await sock.sendMessage(id, { text: goodbyeMessage, mentions: [user] });
        }
      }
    } catch (err) {
      console.error('Automation tracker runtime exception:', err);
    }
  });
}

startBot();
