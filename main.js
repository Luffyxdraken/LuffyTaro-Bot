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
import { handleGroupParticipants } from './plugins/automation.js';

// ==========================================
// 1. RENDER PORT HEALTH CHECK HTTP ENGINE
// ==========================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('LuffyTaro Bot System Online');
}).listen(PORT, () => {
  console.log(`📡 Render Port Healthcheck mapping verified on port ${PORT}`);
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
// 3. MAIN CORE ENGINE CORE FLOW
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

  // 🕒 Automated 15-Minute Dynamic Broadcast Loop
  setInterval(async () => {
    try {
      if (!isLoopActive()) return;

      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) return; 

      const targetGroupIds = getAuthorizedPosterGroups();
      if (targetGroupIds.length === 0) return;

      const lobbyMessage = buildLobbyMessage();
      for (const groupId of targetGroupIds) {
        try {
          await sock.sendMessage(groupId, { text: lobbyMessage });
          await new Promise(r => setTimeout(r, 2000)); // Anti-ban pacing stagger
        } catch (e) {
          console.error(`Loop error dispatching to target group ${groupId}:`, e.message);
        }
      }
    } catch (err) {
      console.error("Global broadcasting engine processing exception:", err);
    }
  }, 15 * 60 * 1000);

  // Connection State Handling
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && !CONFIG.SESSION_ID) QRCode.generate(qr, { small: true });
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) setTimeout(() => startBot(), 5000);
    }
    
    if (connection === 'open') {
      console.log('✅ LuffyTaro Engine Connected Successfully!');
      
      // 🚀 STABILIZED PRIVATE ALIVE MESSAGE (Sent ONLY to Owner DM)
      setTimeout(async () => {
        let rawOwner = (CONFIG.OWNER_NUMBER || CONFIG.OWNER || '917866052212').replace(/[^0-9]/g, '');
        if (rawOwner) {
          if (!rawOwner.startsWith('91') && rawOwner.length === 10) rawOwner = '91' + rawOwner;
          const ownerJid = `${rawOwner}@s.whatsapp.net`;
          try {
            const aliveAlert = `🚀 *LuffyTaro Engine Status Update* 🚀\n\nSystem successfully deployed and operational on cloud clusters! Ready to receive matchmaking traffic.`;
            await sock.sendMessage(ownerJid, { text: aliveAlert });
          } catch (err) {
            console.error("Failed to send alive alert to owner:", err.message);
          }
        }
      }, 6000); 
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('group-participants.update', async (update) => {
    try { await handleGroupParticipants(sock, update); } catch (e) {}
  });

  // ==========================================
  // 4. CHAT SYSTEM FLOW ROUTER
  // ==========================================
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const remoteJid = msg.key.remoteJid;
    const sender = msg.key.participant || remoteJid;
    
    // 🛡️ FILTER: Check if the message is coming from a Group or Channel Newsletter
    const isGroupOrChannel = remoteJid.endsWith('@g.us') || remoteJid.endsWith('@newsletter');
    
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
    if (!text) return;
    
    const isOwnerOrAdmin = verifyAuthority(sender, msg);
    const cleanSenderNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

    // ⚡ Pipeline 1: Command Executions (Starts with Prefix)
    if (text.startsWith(CONFIG.PREFIX)) {
      // STRICTLY BLOCK ALL COMMANDS FROM RUNNING INSIDE GROUPS OR CHANNELS
      if (isGroupOrChannel) return;

      const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      // Owner Override Module
      if (commandName === 'owner') {
        const ownerNum = (CONFIG.OWNER_NUMBER || CONFIG.OWNER || '917866052212').replace(/[^0-9]/g, '');
        await sock.sendMessage(remoteJid, { 
          text: `🏴‍☠️ *BOT OWNER PROFILE*\n───────────────────────────\n\nThis system is managed and maintained by:\n📱 *WhatsApp:* wa.me/${ownerNum}` 
        });
        return;
      }

      if (commands[commandName]) {
        const adminOnlyCmds = ['authorize', 'unauthorize', 'activate', 'deactivate', 'status', 'testpost', 'set'];
        
        if (adminOnlyCmds.includes(commandName)) {
          if (isOwnerOrAdmin) {
            try { await commands[commandName](sock, msg, args, text); } catch (err) { console.error(err); }
          } else {
            await sock.sendMessage(remoteJid, { text: `❌ *ACCESS DENIED* ❌\n───────────────────────────\nYour ID does not hold admin clearance.` });
          }
        } else {
          try { await commands[commandName](sock, msg, args, text); } catch (err) { console.error(err); }
        }
      } else {
        try { await commands.menu(sock, msg); } catch (err) { console.error(err); }
      }
      return; 
    }

    // Stop bot from handling its own outgoing conversational responses
    if (msg.key.fromMe) return;

    // ⚡ Pipeline 2: Conversational Engine (STRICTLY BLOCKED FOR GROUPS & CHANNELS)
    if (isGroupOrChannel) return;

    // 🔓 PUBLIC DM ACCESSIBILITY: Completely unblocked for all regular user DMs
    try {
      await commands.handleAiFallback(sock, msg, text);
    } catch (e) {
      console.error("AI execution fallback channel error:", e);
    }
  });
}

async function run() {
  await initSession();
  await startBot();
}
run();
