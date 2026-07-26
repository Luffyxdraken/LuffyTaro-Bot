import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import http from 'http';
import readline from 'readline';
import { CONFIG } from './config.js'; 
import { 
  commands, 
  getActiveAdminForTime, 
  getAuthorizedPosterGroups, 
  verifyAuthority, 
  buildLobbyMessage, 
  privateUsers,
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

// Global reference for loop timer management
let broadcastInterval = null;

// Helper: Safe input prompt for CLI
const promptPhoneNumber = () => {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve(null);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\n📱 Enter WhatsApp Phone Number (with country code): ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

// Helper: Safe message sending wrapper
async function safeSendMessage(sock, jid, content) {
  try {
    if (!sock || !sock.ws || sock.ws.socket?.readyState !== 1) {
      console.log(`⚠️ Socket disconnected or not ready. Skipping dispatch to ${jid}`);
      return false;
    }
    await sock.sendMessage(jid, content);
    return true;
  } catch (err) {
    console.error(`Loop error dispatching to group ${jid}:`, err.message);
    return false;
  }
}

// ==========================================
// 2. CRYPTO DATA SESSION INITIALIZER
// ==========================================
async function initSession() {
  if (CONFIG.SESSION_ID) {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    const credsPath = path.join(CONFIG.SESSION_DIR, 'creds.json');
    try {
      const base64Data = CONFIG.SESSION_ID.includes(';;;') 
        ? CONFIG.SESSION_ID.split(';;;')[1] 
        : CONFIG.SESSION_ID.includes('~') 
          ? CONFIG.SESSION_ID.split('~')[1] 
          : CONFIG.SESSION_ID;
          
      fs.writeFileSync(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'));
      console.log('✅ SESSION_ID decoded into session credentials.');
    } catch (err) {
      console.error('❌ Emergency Session Restore Failure:', err.message);
    }
  }
}

// ==========================================
// 3. MAIN CORE ENGINE
// ==========================================
async function startBot() {
  // Clear any pre-existing broadcast loop interval on reconnect
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }

  let authState;
  try {
    authState = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  } catch (err) {
    console.error('⚠️ Session data corruption found! Cleaning old state folder...');
    if (fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.rmSync(CONFIG.SESSION_DIR, { recursive: true, force: true });
    }
    authState = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  }

  const { state, saveCreds } = authState;
  let version = [2, 3000, 1017577546];
  try {
    const latest = await fetchLatestWaWebVersion();
    if (latest && latest.version) version = latest.version;
  } catch (e) {}

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    version,
    printQRInTerminal: false,
    browser: ['LuffyTaro Engine', 'Chrome', '1.0.0']
  });

  // Pairing Code Authentication (Render Friendly Fallback)
  if (!sock.authState.creds.registered && !CONFIG.SESSION_ID) {
    let phoneNumber = process.env.PHONE_NUMBER || CONFIG.OWNER_NUMBER || CONFIG.OWNER;

    if (!phoneNumber) {
      phoneNumber = await promptPhoneNumber();
    }

    phoneNumber = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';

    if (phoneNumber) {
      setTimeout(async () => {
        try {
          let code = await sock.requestPairingCode(phoneNumber);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          console.log(`\n=================================`);
          console.log(`🔑 YOUR PAIRING CODE: ${code}`);
          console.log(`=================================\n`);
        } catch (err) {
          console.error("Error requesting pairing code:", err.message);
        }
      }, 4000);
    } else {
      console.error('⚠️ Non-interactive environment detected. Set PHONE_NUMBER or SESSION_ID in Render variables.');
    }
  }

  // 🕒 Automated 15-Minute Dynamic Broadcast Loop attached to THIS socket instance
  broadcastInterval = setInterval(async () => {
    try {
      if (!isLoopActive()) return;

      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) return; 

      const targetGroupIds = getAuthorizedPosterGroups();
      if (targetGroupIds.length === 0) return;

      const lobbyMessage = buildLobbyMessage();
      if (!lobbyMessage) return;

      for (const groupId of targetGroupIds) {
        const sent = await safeSendMessage(sock, groupId, { text: lobbyMessage });
        if (sent) {
          await new Promise(r => setTimeout(r, 3500)); // Anti-ban pacing
        }
      }
    } catch (err) {
      console.error("Global broadcasting engine processing exception:", err);
    }
  }, 15 * 60 * 1000);

  // Connection State Handling
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      if (broadcastInterval) {
        clearInterval(broadcastInterval);
        broadcastInterval = null;
      }

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      
      if (lastDisconnect?.error?.message?.includes('Unsupported state')) {
        console.log('🚨 Crypto state error isolated. Cleaning local state files and recycling session...');
        if (fs.existsSync(CONFIG.SESSION_DIR)) fs.rmSync(CONFIG.SESSION_DIR, { recursive: true, force: true });
        setTimeout(() => startBot(), 2000);
      } else if (statusCode !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting LuffyTaro Engine in 5 seconds...');
        setTimeout(() => startBot(), 5000);
      }
    }
    
    if (connection === 'open') {
      console.log('✅ LuffyTaro Engine Connected Successfully!');
      let rawOwner = (CONFIG.OWNER_NUMBER || CONFIG.OWNER || '').replace(/[^0-9]/g, '');
      if (rawOwner) {
        if (!rawOwner.startsWith('91') && rawOwner.length === 10) rawOwner = '91' + rawOwner;
        const ownerJid = `${rawOwner}@s.whatsapp.net`;
        try {
          const aliveAlert = `🚀 *LuffyTaro Engine Status Update* 🚀\n\nSystem successfully deployed and operational on cloud clusters! Ready to receive matchmaking traffic.`;
          await safeSendMessage(sock, ownerJid, { text: aliveAlert });
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
    if (!msg || !msg.message || msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

    if (!text) return;
    
    const isOwnerOrAdmin = verifyAuthority(sender, msg);
    const cleanSenderNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

    // 🔒 PRIVACY BYPASS ENGINE
    if (privateUsers.includes(cleanSenderNum)) return; 

    // ⚡ Pipeline 1: Command Executions (Starts with Prefix)
    if (text.startsWith(CONFIG.PREFIX)) {
      const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      // Owner Override Module
      if (commandName === 'owner') {
        const ownerNum = (CONFIG.OWNER_NUMBER || CONFIG.OWNER || '917866052212').replace(/[^0-9]/g, '');
        await safeSendMessage(sock, msg.key.remoteJid, { 
          text: `🏴‍☠️ *BOT OWNER PROFILE*\n───────────────────────────\n\nThis system is managed and maintained by:\n📱 *WhatsApp:* wa.me/${ownerNum}\n\nContact the owner directly for hosting setup queries or structural requests.` 
        });
        return;
      }

      if (commands[commandName]) {
        const adminOnlyCmds = ['authorize', 'unauthorize', 'private', 'public', 'activate', 'deactivate', 'status', 'testpost', 'welcome', 'goodbye', 'set', 'setadmin'];
        
        if (adminOnlyCmds.includes(commandName)) {
          if (isOwnerOrAdmin) {
            try { await commands[commandName](sock, msg, args, text); } catch (err) { console.error(err); }
          } else {
            await safeSendMessage(sock, msg.key.remoteJid, { text: `❌ *ACCESS DENIED* ❌\n───────────────────────────\nYour ID (\`${cleanSenderNum}\`) does not hold admin clearance tags.` });
          }
        } else {
          try { await commands[commandName](sock, msg, args, text); } catch (err) { console.error(err); }
        }
      } else {
        try { await commands.menu(sock, msg); } catch (err) { console.error(err); }
      }
      return; 
    }

    // ⚡ Pipeline 2: Conversational Engine (Only active inside Private Messages)
    if (isGroup) return;

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
