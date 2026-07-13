import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { CONFIG } from './config.js';
import { commands, getActiveAdminForTime } from './plugins/commands.js';
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
  
  let version = [2, 3000, 1017577546]; // Default fallback version
  try {
    const latest = await fetchLatestWaWebVersion(); 
    if (latest && latest.version) {
      version = latest.version;
      console.log(`🌐 Synchronized with latest WhatsApp Web version: ${version.join('.')}`);
    }
  } catch (e) {
    console.log('⚠️ Could not fetch live web version, running with updated structural fallback.');
  }

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    version, 
    printQRInTerminal: !CONFIG.SESSION_ID,
    browser: ['LuffyTaro Scrims', 'Chrome', '1.0.0'] 
  });

  // 🕒 15-Minute Auto-Poster Background Schedule Loop
  setInterval(async () => {
    try {
      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) return; // Skip if outside active timings

      const lobbyMessage = `🏴‍☠️ *10x PP LOBBY* *
*PIRATES™* 🇮🇳
> 6 PM PAID CS LOBBY 📌

> PIRATES CS LOBBY 
* *ENTRY - 30/50/100 RS*
* *PP - 60 /100/180 RS*

_*2v2 & 3v3 & 4v4 & 1v1 LIMITED AVAILABLE*_
 
> PIRATES PAID SCRIMS

\`BENEFIT\`
*HIGHEST PP IN* \`COMMUNITY\`
*PP CLEAR IN* \`10\` *MIN*

*_DM  +${activeAdmin} FOR SLOTS_* 🔥`;

      const chats = await sock.groupFetchAllParticipating();
      const targetGroupIds = Object.keys(chats);

      for (const groupId of targetGroupIds) {
        await sock.sendMessage(groupId, { text: lobbyMessage });
        await new Promise(resolve => setTimeout(resolve, 1200)); // Protection delay against spam limits
      }
      console.log(`📢 Auto-posted 15-min update containing active admin phone node: +${activeAdmin}`);
    } catch (err) {
      console.error("⚠️ Background scheduler iteration encountered an issue:", err.message);
    }
  }, 15 * 60 * 1000); // Trigger every 15 minutes smoothly

  // Connection State Monitor
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
      } catch (e) {
        console.log('Could not alert owner chat directly.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  // Group Updates (Handles Welcome/Goodbye Banners smoothly)
  sock.ev.on('group-participants.update', async (update) => {
    try { await handleGroupParticipants(sock, update); } catch (e) { console.error(e); }
  });

  // Message Command Handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

    // Direct, conversational private DM triggers (Without Prefix Requirement)
    if (!isGroup) {
      const lowerText = text.toLowerCase().trim();
      
      // Admin Help DM Relay Tracker
      if (lowerText === 'help' || lowerText.includes('problem') || lowerText.includes('issue')) {
        if (commands.handleHelpRequest) {
          await commands.handleHelpRequest(sock, msg, sender, text);
          return;
        }
      }

      // Pirate Periscript Guidelines Trigger
      if (lowerText === 'guidelines' || lowerText === 'rules' || lowerText === 'info') {
        if (commands.handleGuidelineRequest) {
          await commands.handleGuidelineRequest(sock, msg);
          return;
        }
      }

      // Free Slots Protocol Response
      if (lowerText.includes('free match') || lowerText.includes('free slot')) {
        const freeMatchResponse = `🏴‍☠️ *PIRATES PAID SCRIMS* 🏴‍☠️\n\nHello player! Please note that *free promotional match slots are organized periodically by the administration.* \n\nKeep a close watch on our official broadcast channels and groups for direct announcements regarding upcoming promotional slots!`;
        await sock.sendMessage(msg.key.remoteJid, { text: freeMatchResponse });
        return;
      }
    }

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

async function run() {
  await initSession(); 
  await startBot();    
}

run();
