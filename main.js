import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { CONFIG } from './config.js'; 
import { commands, getActiveAdminForTime, getAuthorizedPosterGroups, verifyAuthority, buildLobbyMessage, privateUsers, toggleBroadcastLoop, isLoopActive } from './plugins/commands.js';
import { handleGroupParticipants } from './plugins/automation.js';

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('LuffyTaro Bot System Online');
}).listen(PORT, () => {
  console.log(`📡 Render Port Healthcheck mapping verified on port ${PORT}`);
});

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

  // 🕒 15-Minute Broadcast Loop
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
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {}
      }
    } catch (err) {}
  }, 15 * 60 * 1000);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && !CONFIG.SESSION_ID) QRCode.generate(qr, { small: true });
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) setTimeout(() => startBot(), 5000);
    }
    
    if (connection === 'open') {
      console.log('✅ LuffyTaro Engine Connected Successfully!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('group-participants.update', async (update) => {
    try { await handleGroupParticipants(sock, update); } catch (e) {}
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

    if (!text) return;
    
    const isOwnerOrAdmin = verifyAuthority(sender);
    const cleanSenderNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

    if (privateUsers.includes(cleanSenderNum)) return; 

    // ⚡ Pipeline 1: Command Prefix Execution Block (Stops execution immediately if matched)
    if (text.startsWith(CONFIG.PREFIX)) {
      const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      if (commands[commandName]) {
        const privilegedActions = ['authorize', 'unauthorize', 'private', 'public', 'iamadmin', 'activate', 'deactivate', 'status'];
        if (privilegedActions.includes(commandName) && !isOwnerOrAdmin) {
          await sock.sendMessage(msg.key.remoteJid, { text: `❌ *ACCESS DENIED*\n───────────────────────────\nYour ID (\`${cleanSenderNum}\`) does not hold admin privileges.` });
          return;
        }

        try { 
          await commands[commandName](sock, msg, args, text); 
          return; // Strictly stop execution here to prevent double processing!
        } catch (err) { 
          console.error(err); 
        }
      }
    }

    // 🧠 Pipeline 2: Natural Language Fallback (Runs ONLY if no direct command prefix matched)
    try {
      await commands.handleAiFallback(sock, msg, text);
    } catch (e) {
      console.error("Critical routing breakdown:", e);
    }
  });
}

async function run() {
  await initSession();
  await startBot();
}
run();
