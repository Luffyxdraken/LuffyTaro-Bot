import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { CONFIG } from './config.js'; 
// ⚡ FIX: Moved privateUsers here to the top level import to resolve the SyntaxError crash
import { commands, getActiveAdminForTime, getAuthorizedPosterGroups, verifyAuthority, buildLobbyMessage, privateUsers } from './plugins/commands.js';
import { handleGroupParticipants } from './plugins/automation.js';
import { getConfig } from './sql/database.js';

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

  // 🕒 Automated 15-Minute Dynamic Broadcast Loop (Maintained Safely)
  setInterval(async () => {
    try {
      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) return; 
      const targetGroupIds = getAuthorizedPosterGroups();
      if (targetGroupIds.length === 0) return;

      const lobbyMessage = buildLobbyMessage();
      for (const groupId of targetGroupIds) {
        try {
          await sock.sendMessage(groupId, { text: lobbyMessage });
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {}
      }
    } catch (err) {}
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
      let rawOwner = (CONFIG.OWNER_NUMBER || CONFIG.OWNER || '').replace(/[^0-9]/g, '');
      if (rawOwner) {
        if (!rawOwner.startsWith('91') && rawOwner.length === 10) rawOwner = '91' + rawOwner;
        const ownerJid = `${rawOwner}@s.whatsapp.net`;
        try {
          const aliveAlert = `🚀 *LuffyTaro Engine Status Update* 🚀\n\nSystem successfully deployed and operational on cloud clusters! Ready to receive matchmaking traffic.`;
          await sock.sendMessage(ownerJid, { text: aliveAlert });
        } catch (err) {}
      }
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
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

    if (!text) return;
    
    const isOwnerOrAdmin = verifyAuthority(sender);
    const cleanSenderNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

    // 🔒 PRIVACY BYPASS ENGINE (Now checks correctly via top level import mapping)
    if (privateUsers.includes(cleanSenderNum)) return; 

    // ⚡ Pipeline 1: Command Executions
    if (text.startsWith(CONFIG.PREFIX)) {
      const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      let targetCmd = commandName === 'help' || commandName === 'menu' ? 'menu' : commandName;

      if (commandName === 'owner') {
        const ownerNum = (CONFIG.OWNER_NUMBER || CONFIG.OWNER || '917866052212').replace(/[^0-9]/g, '');
        await sock.sendMessage(msg.key.remoteJid, { 
          text: `🏴‍☠️ *BOT OWNER PROFILE*\n───────────────────────────\n\nThis system is managed and maintained by:\n📱 *WhatsApp:* wa.me/${ownerNum}\n\nContact the owner directly for hosting setup queries or structural requests.` 
        });
        return;
      }

      if (commands[targetCmd]) {
        const adminOnlyCmds = ['authorize', 'unauthorize', 'private', 'public'];
        
        if (adminOnlyCmds.includes(targetCmd)) {
          if (isOwnerOrAdmin) {
            try { await commands[targetCmd](sock, msg, args, text); } catch (err) { console.error(err); }
          } else {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ *ACCESS DENIED* ❌\n───────────────────────────\nYour ID (\`${cleanSenderNum}\`) does not hold admin clearance tags.` });
          }
        } else {
          // Public commands pass through directly for everyone!
          try { await commands[targetCmd](sock, msg, args, text); } catch (err) { console.error(err); }
        }
        return; 
      }
    }

    if (isGroup) return;

    // 🤖 Pure AI Fallback Router
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
