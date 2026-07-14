import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js'; 
import { commands, verifyAuthority } from './plugins/commands.js';

// 1. Get Active Admin based on Indian Standard Time (IST)
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
  return null; // No active admin currently
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }), // Completely silent to save RAM
    auth: state,
    browser: ['Chrome', 'Windows', '10.0.0'], // Prevents automated browser bans
    printQRInTerminal: true,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        setTimeout(startBot, 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ Bot Connected Successfully!');
      
      // Send "I am Alive" confirmation to the owner on startup
      try {
        const ownerJid = `${CONFIG.OWNER_NUMBER || '917866052212'}@s.whatsapp.net`;
        const aliveMenu = `🤖 *LuffyTaro Bot is ALIVE!* 🚀\n\n` +
                          `Your bot has successfully connected to WhatsApp and is ready to broadcast.\n\n` +
                          `📈 *Current System Parameters:*\n` +
                          `• *Memory Limit:* 400MB Max Cap\n` +
                          `• *Timezone:* Indian Standard Time (IST)\n` +
                          `• *Active Log:* Running smoothly\n\n` +
                          `_This confirmation message ensures the connection handshake is stable._`;
        
        await sock.sendMessage(ownerJid, { text: aliveMenu });
        console.log('📬 Startup confirmation sent to owner!');
      } catch (err) {
        console.log('Failed to send startup confirmation message:', err.message);
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

  // 🕒 Memory-Safe 15-Minute Broadcast Loop
  setInterval(async () => {
    try {
      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) {
        console.log("No active admin scheduled for this current hour.");
        return;
      }
      
      // Replace this list with your actual authorized WhatsApp group JIDs
      const targetGroupIds = ['12036314321321@g.us']; 

      const lobbyMessage = `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™*\n\n` +
                            `> ENTRY - 30/50/100 RS\n` +
                            `> PP - 60 /100/180 RS\n\n` +
                            `*_DM  +${activeAdmin} FOR SLOTS_* 🔥`;

      for (const groupId of targetGroupIds) {
        try {
          await sock.sendMessage(groupId, { text: lobbyMessage });
          await new Promise(r => setTimeout(r, 2000)); // Delay between sends to prevent spam blocks
        } catch (e) {
          console.log(`Skipped group ${groupId}:`, e.message);
        }
      }
    } catch (err) {
      console.log("Broadcast error handled gracefully to preserve memory.");
    }
  }, 15 * 60 * 1000);
}

startBot();
