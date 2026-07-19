import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { CONFIG } from './config.js'; 
import { 
  commands, 
  getActiveAdminForTime, 
  getAuthorizedPosterGroups, 
  verifyAuthority, 
  buildLobbyMessage, 
  isLoopActive
} from './plugins/commands.js';

// ==========================================
// 1. HEALTH CHECK HTTP ENGINE (Render Keep-Alive)
// ==========================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('LuffyTaro Bot System Online');
}).listen(PORT, () => {
  console.log(`📡 Healthcheck mapping active on port ${PORT}`);
});

// ==========================================
// 2. CRYPTO DATA SESSION INITIALIZER
// ==========================================
async function initSession() {
  if (CONFIG.SESSION_ID) {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    const credsPath = path.join(CONFIG.SESSION_DIR, 'creds.json');
    try {
      const base64Data = CONFIG.SESSION_ID.includes(';;;') ? CONFIG.SESSION_ID.split(';;;')[1] : CONFIG.SESSION_ID;
      fs.writeFileSync(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'));
    } catch (err) {
      console.error('❌ Emergency Session Restore Failure:', err.message);
    }
  }
}

// ==========================================
// 3. MAIN CORE ENGINE FLOW
// ==========================================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  let version = [2, 3000, 1017577546];
  try {
    const latest = await fetchLatestWaWebVersion();
    if (latest && latest.version) version = latest.version;
  } catch (e) {}

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    version,
    printQRInTerminal: !CONFIG.SESSION_ID,
    browser: ['LuffyTaro Engine', 'Mac', '1.0.0']
  });

  // 🕒 Automated 15-Minute Broadcast Loop (Active 10:45 AM - 11:45 PM IST)
  setInterval(async () => {
    try {
      if (!isLoopActive()) return;

      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
      const hours = istDate.getHours();
      const minutes = istDate.getMinutes();
      const currentTimeValue = (hours * 100) + minutes; 

      // Strict Operating Window: 10:45 AM (1045) to 11:45 PM (2345)
      if (currentTimeValue < 1045 || currentTimeValue > 2345) {
        return; 
      }

      const targetGroupIds = getAuthorizedPosterGroups();
      if (targetGroupIds.length === 0) return;

      const lobbyMessage = buildLobbyMessage();
      for (const groupId of targetGroupIds) {
        try {
          await sock.sendMessage(groupId, { text: lobbyMessage });
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          console.error(`Broadcast distribution error: ${groupId}`, e.message);
        }
      }
    } catch (err) {}
  }, 15 * 60 * 1000);

  // Connection Management Flow
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && !CONFIG.SESSION_ID) QRCode.generate(qr, { small: true });
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) setTimeout(() => startBot(), 5000);
    }
    
    if (connection === 'open') {
      console.log('✅ LuffyTaro Engine Connected Successfully!');
      
      // 🚀 FIXED ALIVE DISPATCHER: Forces clean targeting to your personal phone DM number
      setTimeout(async () => {
        try {
          let targetOwnerJid = CONFIG.OWNER || "917866052212@s.whatsapp.net";
          if (!targetOwnerJid.endsWith('@s.whatsapp.net')) {
            targetOwnerJid = `${targetOwnerJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
          }
          const aliveAlert = `🚀 *LuffyTaro Engine Status Update* 🚀\n\nSystem successfully deployed and operational! Ready to receive matchmaking traffic in Private DMs.`;
          
          await sock.sendMessage(targetOwnerJid, { text: aliveAlert });
          console.log(`📬 Startup alert cleanly pushed directly to Owner DM: ${targetOwnerJid}`);
        } catch (err) {
          console.error("Failed to send alive alert to owner inbox:", err.message);
        }
      }, 5000); 
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  // ==========================================
  // 4. GLOBAL CHAT ROUTER PIPELINE
  // ==========================================
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');
    const isChannel = remoteJid.endsWith('@newsletter');
    const isPrivateDm = remoteJid.endsWith('@s.whatsapp.net');

    // 🛡️ REPAIRED EXTRACTOR: Captures nested text arrays from new session tokens perfectly
    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text || 
                 msg.message.imageMessage?.caption || 
                 msg.message.videoMessage?.caption ||
                 msg.message.viewOnceMessageV2?.message?.imageMessage?.caption ||
                 msg.message.viewOnceMessageV2?.message?.extendedTextMessage?.text ||
                 '';
                 
    if (!text) return;

    // Prevent loop spam from the bot account, but allow dot commands to run
    if (msg.key.fromMe && !text.startsWith(CONFIG.PREFIX)) return;

    // Universal sender tracing array
    const rawSender = msg.key.participant || msg.participant || remoteJid;
    const isOwnerOrAdmin = msg.key.fromMe || verifyAuthority(rawSender, msg);

    // ⚡ Pipeline 1: Dot Command Processors (`.set`, `.slots`, etc.)
    if (text.startsWith(CONFIG.PREFIX)) {
      // Security Gate: Block non-admins from triggering commands inside Groups and Channels
      if ((isGroup || isChannel) && !isOwnerOrAdmin) return;

      const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      if (commands[commandName]) {
        const adminOnlyCmds = ['authorize', 'unauthorize', 'activate', 'deactivate', 'status', 'testpost', 'set'];
        if (adminOnlyCmds.includes(commandName)) {
          if (isOwnerOrAdmin) {
            try { await commands[commandName](sock, msg, args, text); } catch (err) { console.error(err); }
          } else {
            await sock.sendMessage(remoteJid, { text: `❌ *ACCESS DENIED*\nYour ID does not hold admin clearance.` });
          }
        } else {
          try { await commands[commandName](sock, msg, args, text); } catch (err) { console.error(err); }
        }
      } else {
        // Fallback to menu if command doesn't exist
        try { await commands.menu(sock, msg); } catch (err) { console.error(err); }
      }
      return; 
    }

    // ⚡ Pipeline 2: Conversational AI Engine
    // 🛑 CRITICAL SAFETY GUARD: Blocks conversational AI completely from Groups and Channels!
    if (!isPrivateDm) return;

    try {
      await commands.handleAiFallback(sock, msg, text);
    } catch (e) {
      console.error("Interaction flow fallback exception:", e);
    }
  });
}

async function run() {
  await initSession();
  await startBot();
}
run();
