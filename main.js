import { makeWASocket, useMultiFileAuthState, DisconnectReason, delay, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import http from 'http'; 
import { CONFIG } from './config.js'; 
import { commands, verifyAuthority } from './plugins/commands.js';

// ==========================================================
// 0. BYPASS FOR RENDER FREE VERSION (SESSION ID RETRIEVER)
// ==========================================================
setTimeout(() => {
  const paths = [
    path.join(CONFIG.SESSION_DIR || './session', 'creds.json'),
    './session/creds.json',
    './auth_info/creds.json',
    './creds.json'
  ];
  let found = false;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const creds = fs.readFileSync(p, 'utf-8');
        console.log('\n=================== COPY THIS SESSION ID ===================\n');
        console.log('LuffyTaro;;;' + Buffer.from(creds).toString('base64'));
        console.log('\n============================================================\n');
        found = true;
        break;
      } catch (e) {
        console.log('[Bypass Error] Failed to read file:', e.message);
      }
    }
  }
  if (!found) {
    console.log('\n[Bypass Status] Session files not found yet. The bot needs to be linked first!\n');
  }
}, 10000);

// ==========================================================
// 1. INSTANT PORT BINDING FOR RENDER (MUST RUN IMMEDIATELY)
// ==========================================================
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('LuffyTaro Engine is running perfectly!');
}).listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Render Healthcheck Port active on port ${PORT}`);
});

// ==========================================
// 2. INDIAN STANDARD TIME (IST) ROUTER
// ==========================================
function getActiveAdminForTime() {
  const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const [hour, minute] = formatter.format(new Date()).split(':').map(Number);
  const totalMinutes = hour * 60 + minute;

  // Admin 1: 10:30 AM - 11:45 AM & 12:30 PM - 2:45 PM
  if ((totalMinutes >= 630 && totalMinutes <= 705) || (totalMinutes >= 750 && totalMinutes <= 885)) {
    return '919158210010';
  }
  // Admin 2: 3:30 PM - 5:45 PM & 6:30 PM - 8:45 PM
  if ((totalMinutes >= 930 && totalMinutes <= 1065) || (totalMinutes >= 1110 && totalMinutes <= 1245)) {
    return '919954865200';
  }
  // Admin 3: 9:30 PM - 11:45 PM
  if (totalMinutes >= 1290 && totalMinutes <= 1425) {
    return '917866052212';
  }
  return null; 
}

// ==========================================
// 3. SESSION INITIALIZATION & RESTORE
// ==========================================
function initSession() {
  if (CONFIG.SESSION_ID) {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    }
    const credsPath = path.join(CONFIG.SESSION_DIR, 'creds.json');
    try {
      const base64Data = CONFIG.SESSION_ID.includes(';;;') 
        ? CONFIG.SESSION_ID.split(';;;')[1] 
        : CONFIG.SESSION_ID;
        
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      JSON.parse(decoded); 
      fs.writeFileSync(credsPath, decoded);
      console.log(`⚙️ Session credentials successfully restored from Env.`);
    } catch (err) {
      console.error('❌ SESSION_ID restoration failed:', err.message);
    }
  }
}

initSession();

// ==========================================
// 4. MAIN BOT ENGINE
// ==========================================
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  
  let version = [2, 3000, 1017531287]; // Fallback
  try {
    const { version: latestVersion, isLatest } = await fetchLatestWaWebVersion();
    version = latestVersion;
    console.log(`🌐 Successfully loaded WhatsApp Web v${version.join('.')}. Latest: ${isLatest}`);
  } catch (err) {
    console.log(`⚠️ Failed fetching latest version. Using fallback: v${version.join('.')}`);
  }

  const sock = makeWASocket({
    version, 
    logger: pino({ level: 'silent' }), 
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04'], 
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 15000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (!sock.authState.creds.registered && !connection) {
      const botPhone = CONFIG.BOT_NUMBER ? CONFIG.BOT_NUMBER.replace(/[^0-9]/g, '') : '';
      if (botPhone) {
        await delay(6000); 
        try {
          console.log(`🚀 Requesting pairing code for BOT phone number: +${botPhone}`);
          const code = await sock.requestPairingCode(botPhone);
          console.log('\n===================================================');
          console.log(`🔑 YOUR WHATSAPP PAIRING CODE: ${code}`);
          console.log('===================================================\n');
        } catch (err) {
          console.error('Failed to request pairing code:', err.message);
        }
      }
    }
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`🔌 Connection closed. Code: ${statusCode}`);
      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) return;

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(startBot, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
      }
    } else if (connection === 'open') {
      reconnectAttempts = 0;
      console.log('✅ LuffyTaro Engine Connected Successfully!');
      
      // Clean Owner Number securely to prevent double-91 formatting crash
      let rawOwner = (CONFIG.OWNER_NUMBER || '917866052212').replace(/[^0-9]/g, '');
      if (!rawOwner.startsWith('91') && rawOwner.length === 10) {
        rawOwner = '91' + rawOwner;
      }
      const ownerJid = `${rawOwner}@s.whatsapp.net`;

      try {
        const credsPath = path.join(CONFIG.SESSION_DIR, 'creds.json');
        if (fs.existsSync(credsPath)) {
          const credsRaw = fs.readFileSync(credsPath, 'utf-8');
          const base64Session = Buffer.from(credsRaw).toString('base64');
          
          const sessionMsg = `🔑 *YOUR NEW SESSION ID* 🔑\n\n` +
                             `\`\`\`LuffyTaro;;;${base64Session}\`\`\``;
          
          await sock.sendMessage(ownerJid, { text: sessionMsg });
        }
      } catch (err) {
        console.error('Failed to send session string:', err.message);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!text) return;
    
    const sender = msg.key.participant || msg.key.remoteJid;
    const isOwnerOrAdmin = verifyAuthority(sender);

    if (text.startsWith(CONFIG.PREFIX)) {
      const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      if (commands[commandName]) {
        if (isOwnerOrAdmin) {
          await commands[commandName](sock, msg, args, text);
        } else {
          await sock.sendMessage(msg.key.remoteJid, { text: "❌ Access Denied." });
        }
      }
    }
  });

  // Automated 15-Min Loop
  setInterval(async () => {
    try {
      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) return;
      const targetGroupIds = ['12036314321321@g.us']; 
      const lobbyMessage = `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™*\n\n` +
                            `> ENTRY - 30/50/100 RS\n` +
                            `> PP - 60 /100/180 RS\n\n` +
                            `*_DM  +${activeAdmin} FOR SLOTS_* 🔥`;

      for (const groupId of targetGroupIds) {
        await sock.sendMessage(groupId, { text: lobbyMessage });
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.log("Protected Loop Thread.");
    }
  }, 15 * 60 * 1000);
}

startBot();
