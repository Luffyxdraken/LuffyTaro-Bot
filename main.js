import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { loadPlugins, commands } from './lib/Handler.js';
import { getSettings } from './sql/database.js';

// 🚀 Native File-Based Config Parser (100% immune to ESM syntax compilation issues)
let CONFIG = {};
try {
  const configPath = path.join(process.cwd(), 'config.js');
  if (fs.existsSync(configPath)) {
    const fileContent = fs.readFileSync(configPath, 'utf8');
    
    // Upgraded string extraction regex to discard trailing comments safely
    const extractVar = (name) => {
      const regex = new RegExp(`(?:const|let|var|export\\s+const)?\\s*${name}\\s*=\\s*['"\`]([^'"\`\\r\\n]+)['"\`]`);
      const match = fileContent.match(regex);
      return match ? match[1].split('//')[0].trim() : undefined;
    };

    CONFIG = {
      SESSION_ID: extractVar('SESSION_ID') || extractVar('sessionId'),
      SESSION_DIR: extractVar('SESSION_DIR') || extractVar('sessionDir') || 'session',
      PREFIX: extractVar('PREFIX') || extractVar('prefix') || '.'
    };
  }
} catch (e) {
  console.error('⚠️ Configuration layout reading exception:', e.message);
}

// Fallback safety assignment 
CONFIG.SESSION_DIR = CONFIG.SESSION_DIR || 'session';
CONFIG.PREFIX = CONFIG.PREFIX || '.';

// Decodes Session ID and creates the creds file if it doesn't exist
async function initSession() {
  const sessionId = CONFIG.SESSION_ID;
  const sessionDirectory = CONFIG.SESSION_DIR;

  if (sessionId) {
    if (!fs.existsSync(sessionDirectory)) {
      fs.mkdirSync(sessionDirectory, { recursive: true });
    }
    const credsPath = path.join(sessionDirectory, 'creds.json');
    
    if (!fs.existsSync(credsPath)) {
      try {
        const base64Data = sessionId.includes(';;;') 
          ? sessionId.split(';;;')[1] 
          : sessionId;
          
        const decodedCreds = Buffer.from(base64Data, 'base64').toString('utf-8');
        fs.writeFileSync(credsPath, decodedCreds);
        console.log('✅ Session ID successfully authenticated and imported!');
      } catch (err) {
        console.error('❌ Invalid Session ID format:', err.message);
      }
    }
  }
}

// Safeguard tracking flag to prevent duplicate command registrations
let isPluginsLoaded = false;

async function startBot() {
  if (!isPluginsLoaded) {
    await loadPlugins();
    await initSession(); // Run session string processor
    isPluginsLoaded = true;
  }
  
  // Safely assign a fallback path if CONFIG.SESSION_DIR isn't set
  const sessionDirectory = CONFIG.SESSION_DIR || 'session';
  const { state, saveCreds } = await useMultiFileAuthState(sessionDirectory);
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state
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
        if (settings?.antilink && text.includes('chat.whatsapp.com')) return;

        // ✅ Hybrid Compatibility layer: Runs .execute() or falls back to .function()
        if (typeof command.execute === 'function') {
          await command.execute({ client: sock, from: msg.key.remoteJid, msg, args, isGroup: msg.key.remoteJid.endsWith('@g.us') });
        } else if (typeof command.function === 'function') {
          await command.function(sock, msg, args);
        }
      } catch (err) {
        console.error(`Error executing ${commandName}:`, err);
      }
    }
  });

  // 2. DISCORD-STYLE BACKGROUND AUTOMATION GATEWAY
  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    
    try {
      // Pull targeted group tracking rules with fallback verification
      const settings = (await getSettings(id)) || {};
      
      for (let user of participants) {
        if (!user) continue;
        const cleanUserTag = `@${user.split('@')[0]}`;

        // Automated Entrance Alert
        if (action === 'add' && settings.welcome === 'true') {
          const welcomeMessage = `📥 **[NEW MEMBER]** 📥\n\nWelcome ${cleanUserTag} to our server layout!\n━━━━━━━━━━━━━━━━━━━━\n💬 Check the pins and enjoy your stay!`;
          await sock.sendMessage(id, { text: welcomeMessage, mentions: [user] }).catch(() => {});
        }

        // Automated Exit Alert
        if (action === 'remove' && settings.goodbye === 'true') {
          const goodbyeMessage = `📤 **[USER EXIT]** 📤\n\n${cleanUserTag} just left the server architecture. \n━━━━━━━━━━━━━━━━━━━━\n*Press F to pay respects.*`;
          await sock.sendMessage(id, { text: goodbyeMessage, mentions: [user] }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Automation tracker runtime exception:', err);
    }
  });
}

// 🌐 Render Health Check Server
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('🚀 LuffyTaro Bot Supervisor Node is Active and Operational!');
});

app.listen(PORT, () => {
  console.log(`🌐 Health check server listening on port ${PORT}`);
});

// Run the core bot loop
startBot();
