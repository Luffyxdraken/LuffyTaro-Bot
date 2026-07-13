import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { CONFIG } from './config.js'; 
import { commands, getActiveAdminForTime, getActiveMatch, getAuthorizedPosterGroups, verifyAuthority } from './plugins/commands.js';
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

  // 🕒 Automated 15-Minute Broadcast Loop
  setInterval(async () => {
    try {
      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) return;
      const targetGroupIds = getAuthorizedPosterGroups();
      if (targetGroupIds.length === 0) return;

      const lobbyMessage = `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™*\n\n> ENTRY - 30/50/100 RS\n> PP - 60 /100/180 RS\n\n*_DM  +${activeAdmin} FOR SLOTS_* 🔥`;
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
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('group-participants.update', async (update) => {
    try { await handleGroupParticipants(sock, update); } catch (e) {}
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

    if (!text) return;
    const isOwnerOrAdmin = verifyAuthority(sender);

    // ⚡ 1. COMMAND PROCESSING PIPELINE
    if (text.startsWith(CONFIG.PREFIX)) {
      const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      let targetCmd = commandName === 'help' || commandName === 'menu' ? 'menu' : commandName;

      if (commands[targetCmd]) {
        if (isOwnerOrAdmin) {
          try { await commands[targetCmd](sock, msg, args, text); } catch (err) { console.error(err); }
          return;
        } else {
          await sock.sendMessage(msg.key.remoteJid, { text: `❌ *ACCESS DENIED* ❌\n───────────────────────────\nYour ID (\`${sender.split('@')[0]}\`) does not hold admin clearance tags.` });
          return;
        }
      }
    }

    if (isGroup) return;

    // 🛡️ 2. STRICT GATEKEEPER COMMUNITY ACCESS VALIDATION
    let userIsInMainGroup = false;
    
    if (!isOwnerOrAdmin) {
      const targetCheckHub = CONFIG.MAIN_GROUP_JID || "None";
      
      if (targetCheckHub && targetCheckHub !== "None") {
        try {
          // Force fetch the live community roster directly from WhatsApp
          const metadata = await sock.groupMetadata(targetCheckHub);
          const cleanSenderId = sender.split('@')[0].split(':')[0];
          
          userIsInMainGroup = metadata.participants.some(p => {
            const cleanParticipantId = p.id.split('@')[0].split(':')[0];
            return cleanParticipantId === cleanSenderId;
          });
        } catch (e) {
          // If the group doesn't exist or isn't loaded yet, default to false to protect your gate
          userIsInMainGroup = false;
        }
      } else {
        // If no main group ID is assigned yet, allow chatting
        userIsInMainGroup = true; 
      }
    } else {
      userIsInMainGroup = true; // Admins skip verification entirely
    }

    // 🚫 REJECTION ACTION FOR EXTERNAL PLAYERS
    if (!userIsInMainGroup) {
      const customJoinAlert = `❌ *ACCESS DENIED* ❌\n───────────────────────────\n\nSorry, you are not a member of *Pirates Scrims* yet!\n\nTo interact with the bot engine, view guidelines, or reserve open slots, you must be part of our official main community hub.\n\n🔗 *Click here to join Pirates Scrims:* \n👉 ${CONFIG.MAIN_GROUP_INVITE_LINK}\n\n_Once you have joined the group, try messaging the bot again!_`;
      await sock.sendMessage(msg.key.remoteJid, { text: customJoinAlert });
      return;
    }

    // 🔓 3. CONVERSATIONAL TEXT DISTRIBUTOR
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText === 'guidelines' || lowerText === 'rules' || lowerText === 'info') {
      try { await sock.sendMessage(msg.key.remoteJid, { text: "🏴‍☠️ *PIRATES TOURNAMENT RULES*\n\n1. Play fair and cleanly.\n2. Payout processing takes 10 minutes max.\n3. Report anomalies directly via the *help* utility." }); } catch (e) {}
      return;
    }

    if (lowerText === 'help' || lowerText.includes('problem') || lowerText.includes('issue')) {
      const systemAdminNode = getActiveAdminForTime() || CONFIG.OWNER.split('@')[0];
      await sock.sendMessage(msg.key.remoteJid, { text: `🛠️ *SUPPORT TICKET OPENED*\n\nYour alert has been received. Our active shift manager will contact you shortly!` });
      await sock.sendMessage(`${systemAdminNode}@s.whatsapp.net`, { text: `🚨 *URGENT SUPPORT TICKET*\n📱 *User:* wa.me/${sender.split('@')[0].split(':')[0]}\n📝 *Text:* "${text}"` });
      return;
    }

    await commands.handleAiFallback(sock, msg, text);
  });
}

async function run() {
  await initSession();
  await startBot();
}
run();
