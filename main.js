import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import http from 'http'; // Preserving HTTP Server for Render Healthcheck
import { CONFIG } from './config.js'; 
import { commands, verifyAuthority } from './plugins/commands.js';

// ==========================================
// 1. RENDER PORT HEALTHCHECK SERVER (CRITICAL)
// ==========================================
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('LuffyTaro Engine is Live and Running!');
}).listen(PORT, () => {
  console.log(`📡 Render Port Healthcheck mapping verified on port ${PORT}`);
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
  return null; // Safe fallback if outside shift hours
}

// ==========================================
// 3. MAIN BOT ENGINE
// ==========================================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }), // Suppressed logs to protect 512MB RAM Limit
    auth: state,
    browser: ['Chrome', 'Windows', '10.0.0'], // Prevents bot fingerprinting
    printQRInTerminal: true,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });

  sock.ev.on('creds.update', saveCreds);

  // Connection Handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        setTimeout(startBot, 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ LuffyTaro Engine Connected Successfully!');
      
      // Send "I am Alive" confirmation message to the owner
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
        console.log('📬 Startup message dispatched to owner.');
      } catch (err) {
        console.log('Failed to send startup verification to owner:', err.message);
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

  // ==========================================
  // 4. MEMORY-SAFE 15-MINUTE AUTOMATION LOOP
  // ==========================================
  setInterval(async () => {
    try {
      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) {
        console.log("Idle period: No active admin scheduled right now.");
        return;
      }
      
      // Note: Make sure to keep your authorized group ID list in commands.js or config.js
      const targetGroupIds = ['12036314321321@g.us']; 

      const lobbyMessage = `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™*\n\n` +
                            `> ENTRY - 30/50/100 RS\n` +
                            `> PP - 60 /100/180 RS\n\n` +
                            `*_DM  +${activeAdmin} FOR SLOTS_* 🔥`;

      for (const groupId of targetGroupIds) {
        try {
          await sock.sendMessage(groupId, { text: lobbyMessage });
          await new Promise(r => setTimeout(r, 2000)); // Delay between messages to protect account health
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
