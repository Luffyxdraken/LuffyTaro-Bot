import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import http from 'http'; 
import { CONFIG } from './config.js'; 
import { commands, verifyAuthority } from './plugins/commands.js';

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

  // Admin 1: 10:30 AM - 11:45 AM (630-705) & 12:30 PM - 2:45 PM (750-885)
  if ((totalMinutes >= 630 && totalMinutes <= 705) || (totalMinutes >= 750 && totalMinutes <= 885)) {
    return '919158210010';
  }
  // Admin 2: 3:30 PM - 5:45 PM (930-1065) & 6:30 PM - 8:45 PM (1110-1245)
  if ((totalMinutes >= 930 && totalMinutes <= 1065) || (totalMinutes >= 1110 && totalMinutes <= 1245)) {
    return '919954865200';
  }
  // Admin 3: 9:30 PM - 11:45 PM (1290-1425)
  if (totalMinutes >= 1290 && totalMinutes <= 1425) {
    return '917866052212';
  }
  return null; 
}

// Log scheduled shift on boot
const currentScheduledAdmin = getActiveAdminForTime();
console.log(`⏰ Time Sync (IST): Current active admin scheduled: ${currentScheduledAdmin || 'None (Idle period)'}`);

// ==========================================
// 3. SESSION INITIALIZATION
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
      JSON.parse(decoded); // Validate JSON format
      fs.writeFileSync(credsPath, decoded);
      console.log(`⚙️ Session credentials verified and restored. Size: ${decoded.length} bytes`);
    } catch (err) {
      console.error('❌ Session restoration failed. Your SESSION_ID string may be corrupted:', err.message);
    }
  }
}

initSession();

// ==========================================
// 4. DYNAMIC QR TERMINAL/LINK PRINTER
// ==========================================
async function printQR(qr) {
  console.log('\n=================== SCAN QR CODE ===================');
  try {
    const qrcodeTerminal = await import('qrcode-terminal');
    qrcodeTerminal.default.generate(qr, { small: true });
  } catch (e) {
    console.log('💡 Tip: Install "qrcode-terminal" to render the QR directly in your terminal.');
  }
  console.log(`\n🔗 OR open this link to scan with your phone:\n👉 https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}\n`);
  console.log('===================================================\n');
}

// ==========================================
// 5. MAIN BOT ENGINE
// ==========================================
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }), // Completely silent to save system memory
    auth: state,
    browser: ['Chrome', 'Windows', '10.0.0'], // Mimics Windows Desktop client
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 15000,
  });

  sock.ev.on('creds.update', saveCreds);

  // Connection Handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      await printQR(qr);
    }
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || 'Connection lost';
      console.log(`🔌 Connection closed. Reason: ${reason} (Code: ${statusCode})`);

      // Avoid infinite loop crashes on terminal or expired sessions
      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        console.log('❌ Session has expired or logged out. Resetting connection attempts. Please clear SESSION_ID and scan new QR.');
        return;
      }

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential Backoff
        console.log(`🔄 Reconnecting in ${delay / 1000}s... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(startBot, delay);
      } else {
        console.log('❌ Maximum reconnect attempts reached. Waiting for manual restart.');
      }
    } else if (connection === 'open') {
      reconnectAttempts = 0; // Reset safe connection attempt counter
      console.log('✅ LuffyTaro Engine Connected Successfully!');
      
      // Notify Owner the Bot is Live with System Status
      try {
        const ownerJid = `${CONFIG.OWNER_NUMBER || '917866052212'}@s.whatsapp.net`;
        const aliveMenu = `🤖 *LuffyTaro Engine is ALIVE!* 🚀\n\n` +
                          `Hey Chief! Your bot has successfully completed the handshake with WhatsApp.\n\n` +
                          `📊 *System Status:*\n` +
                          `• *Node Memory Limit:* 400MB (Safe-Cap)\n` +
                          `• *Timezone Sync:* Indian Standard Time (IST)\n` +
                          `• *Healthcheck Port:* 10000 (Render Map Ok)\n\n` +
                          `_Everything is green. Your automation is active!_`;
        
        await sock.sendMessage(ownerJid, { text: aliveMenu });
        console.log('📬 Startup confirmation message sent to owner.');
      } catch (err) {
        console.log('Unable to reach owner with startup message:', err.message);
      }
    }
  });

  // Message Handler (Preserving Command Plugins & Permissions)
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

  // ==========================================================
  // 6. MEMORY-SAFE 15-MINUTE AUTOMATION LOOP (NON-DESTRUCTIVE)
  // ==========================================================
  setInterval(async () => {
    try {
      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) {
        console.log("Idle period: No active admin scheduled right now.");
        return;
      }
      
      // Maintain your list of group JIDs inside commands.js or config.js
      const targetGroupIds = ['12036314321321@g.us']; 

      const lobbyMessage = `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™*\n\n` +
                            `> ENTRY - 30/50/100 RS\n` +
                            `> PP - 60 /100/180 RS\n\n` +
                            `*_DM  +${activeAdmin} FOR SLOTS_* 🔥`;

      for (const groupId of targetGroupIds) {
        try {
          await sock.sendMessage(groupId, { text: lobbyMessage });
          await new Promise(r => setTimeout(r, 2000)); // Delay between sends to prevent anti-spam flags
        } catch (e) {
          console.log(`Failed to post to group ${groupId}:`, e.message);
        }
      }
    } catch (err) {
      console.log("Memory safety catch: Automated loop protected from crash.");
    }
  }, 15 * 60 * 1000);
}

startBot();
