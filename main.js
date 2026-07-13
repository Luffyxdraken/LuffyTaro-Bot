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
  res.end('LuffyTaro Bot Live');
}).listen(PORT, () => {
  console.log(`📡 Render Health Check active on port ${PORT}`);
});

async function initSession() {
  if (CONFIG.SESSION_ID) {
    if (!fs.existsSync(CONFIG.SESSION_DIR)) {
      fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
    }
    const credsPath = path.join(CONFIG.SESSION_DIR, 'creds.json');
    try {
      const base64Data = CONFIG.SESSION_ID.includes(';;;') ? CONFIG.SESSION_ID.split(';;;')[1] : CONFIG.SESSION_ID;
      fs.writeFileSync(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'));
    } catch (err) {
      console.error('❌ Session decoding failed:', err.message);
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
    browser: ['LuffyTaro Scrims', 'Chrome', '1.0.0']
  });

  // 🕒 15-Minute Auto-Poster Background Loop
  setInterval(async () => {
    try {
      const activeAdmin = getActiveAdminForTime();
      if (!activeAdmin) return;

      const targetGroupIds = getAuthorizedPosterGroups();
      if (targetGroupIds.length === 0) return; 

      const lobbyMessage = `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™* 🇮🇳\n> 6 PM PAID CS LOBBY 📌\n\n> PIRATES CS LOBBY \n* *ENTRY - 30/50/100 RS*\n* *PP - 60 /100/180 RS*\n\n_*2v2 & 3v3 & 4v4 & 1v1 LIMITED AVAILABLE*_\n \n> PIRATES PAID SCRIMS\n\n\`BENEFIT\`\n*HIGHEST PP IN* \`COMMUNITY\`\n*PP CLEAR IN* \`10\` *MIN*\n\n*_DM  +${activeAdmin} FOR SLOTS_* 🔥`;

      for (const groupId of targetGroupIds) {
        try {
          await sock.sendMessage(groupId, { text: lobbyMessage });
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (err) {
          console.error(`Could not post to group ${groupId}:`, err.message);
        }
      }
    } catch (err) {
      console.error("⚠️ Scheduler issue:", err.message);
    }
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

    if (sock.user && sock.user.id && sender.includes(sock.user.id.split(':')[0])) return;

    // 🔥 RULE 1: PREFIX COMMAND OVERRIDE (DM OR GROUP)
    if (text.startsWith(CONFIG.PREFIX)) {
      const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      let targetCmd = commandName === 'help' || commandName === 'menu' ? 'menu' : commandName;

      if (commands[targetCmd]) {
        try { await commands[targetCmd](sock, msg, args, text); } catch (err) { console.error(err); }
        return;
      }
    }

    if (isGroup) return;

    // 🛡️ GATEKEEPER CHECK: Is this user allowed to talk to the bot?
    const isOwnerOrAdmin = verifyAuthority(sender);
    let userIsInMainGroup = false;

    if (!isOwnerOrAdmin && CONFIG.MAIN_GROUP_JID) {
      try {
        const metadata = await sock.groupMetadata(CONFIG.MAIN_GROUP_JID);
        userIsInMainGroup = metadata.participants.some(p => p.id === sender);
      } catch (e) {
        userIsInMainGroup = true;
      }
    } else {
      userIsInMainGroup = true; 
    }

    // 🚫 REJECTION FLOW: Player is NOT in your main announcement group
    if (!userIsInMainGroup) {
      const rejectionText = `⚠️ *ACCESS DENIED* ⚠️\n\nYou are not a verified member of our community platform.\n\n👉 *Please join our official group using this link first:* ${CONFIG.MAIN_GROUP_INVITE_LINK}\n\nOnce joined, you can message the bot engine freely!`;
      await sock.sendMessage(msg.key.remoteJid, { text: rejectionText });
      return;
    }

    // 🔓 APPROVED FLOW: Player is in the group or is an authorized admin
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText === 'help' || lowerText === 'menu' || lowerText.includes('problem') || lowerText.includes('issue')) {
      await commands.handleHelpRequest(sock, msg, sender, text);
      return;
    }

    if (lowerText === 'guidelines' || lowerText === 'rules' || lowerText === 'info') {
      await commands.handleGuidelineRequest(sock, msg);
      return;
    }

    if (lowerText.includes('free match') || lowerText.includes('free slot')) {
      await sock.sendMessage(msg.key.remoteJid, { text: `🏴‍☠️ *PIRATES PAID SCRIMS*\n\nHello player! Free promotional match slots are organized periodically. Stay tuned to our official main group for announcements!` });
      return;
    }

    const activeMatch = getActiveMatch();
    if (activeMatch) {
      await commands.handleTournamentPitch(sock, msg);
    } else {
      await commands.handleAiFallback(sock, msg, text);
    }
  });
}

async function run() {
  await initSession();
  await startBot();
}
run();
