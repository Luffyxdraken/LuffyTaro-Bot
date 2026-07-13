import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { CONFIG } from './config.js';
import { commands, getActiveAdminForTime, getActiveMatch } from './plugins/commands.js';
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
      console.log('✅ Fresh Session ID written to disk.');
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
  } catch (e) {
    console.log('⚠️ Running with default web fallback version.');
  }

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

      const lobbyMessage = `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™* 🇮🇳\n> 6 PM PAID CS LOBBY 📌\n\n> PIRATES CS LOBBY \n* *ENTRY - 30/50/100 RS*\n* *PP - 60 /100/180 RS*\n\n_*2v2 & 3v3 & 4v4 & 1v1 LIMITED AVAILABLE*_\n \n> PIRATES PAID SCRIMS\n\n\`BENEFIT\`\n*HIGHEST PP IN* \`COMMUNITY\`\n*PP CLEAR IN* \`10\` *MIN*\n\n*_DM  +${activeAdmin} FOR SLOTS_* 🔥`;

      const chats = await sock.groupFetchAllParticipating();
      for (const groupId of Object.keys(chats)) {
        await sock.sendMessage(groupId, { text: lobbyMessage });
        await new Promise(resolve => setTimeout(resolve, 1500));
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
      if (statusCode !== DisconnectReason.loggedOut) {
        setTimeout(() => startBot(), 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ Bot Online.');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('group-participants.update', async (update) => {
    try { await handleGroupParticipants(sock, update); } catch (e) { console.error(e); }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

    // 📩 Handle Conversational Triggers in Private Messages
    if (!isGroup) {
      const lowerText = text.toLowerCase().trim();
      
      if (lowerText === 'help' || lowerText.includes('problem') || lowerText.includes('issue')) {
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

      // 🤖 Interactive Tournament Inbound Logic for Casual DMs ("hi", "hello", or questions)
      if (!text.startsWith(CONFIG.PREFIX)) {
        const activeMatch = getActiveMatch();
        if (activeMatch) {
          // If a tournament is active, automatically intercept the message and pitch the registration details!
          await commands.handleTournamentPitch(sock, msg);
          return;
        } else {
          // Default AI Catch-all
          await commands.handleAiFallback(sock, msg, text);
          return;
        }
      }
    }

    // 🛠️ Command Prefix Handler (.help, .send, etc.)
    if (!text.startsWith(CONFIG.PREFIX)) return;

    const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    let targetCmd = commandName;
    if (commandName === 'menu' || commandName === 'help') targetCmd = 'menu';

    if (commands[targetCmd]) {
      try {
        await commands[targetCmd](sock, msg, args, text);
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
