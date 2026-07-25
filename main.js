import makeWASocket, { 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import http from 'http';
import fs from 'fs';
import path from 'path';

// ==========================================
// 1. RENDER PORT HEALTHCHECK (Prevents Timeout)
// ==========================================
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('LuffyTaro Bot is Active and Running!');
}).listen(PORT, () => {
  console.log(`🌐 Healthcheck server listening on port ${PORT}`);
});

// ==========================================
// 2. HELPER: EXTRACT SESSION ID FROM ENV
// ==========================================
function loadSessionFromEnv() {
  const authFolder = './session';
  const sessionId = process.env.SESSION_ID;

  if (sessionId && !fs.existsSync(path.join(authFolder, 'creds.json'))) {
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    try {
      // Remove custom prefixes if present (e.g., "LuffyTaro~", "Session~")
      const rawBase64 = sessionId.includes('~') ? sessionId.split('~')[1] : sessionId;
      const decodedData = Buffer.from(rawBase64, 'base64').toString('utf-8');
      
      fs.writeFileSync(path.join(authFolder, 'creds.json'), decodedData);
      console.log('✅ SESSION_ID successfully extracted into ./session/creds.json');
    } catch (err) {
      console.error('❌ Failed to decode SESSION_ID:', err.message);
    }
  }
}

// ==========================================
// 3. MAIN BOT FUNCTION
// ==========================================
async function startBot() {
  // Step A: Load session from SESSION_ID variable if present
  loadSessionFromEnv();

  // Step B: Initialize multi-file auth state
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    printQRInTerminal: false
  });

  // Step C: Fallback Pairing Code Generator (If not logged in via Session ID)
  if (!sock.authState.creds.registered) {
    const phoneNumber = process.env.PHONE_NUMBER || "919382276556";

    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n=================================`);
        console.log(`🔑 YOUR PAIRING CODE: ${code}`);
        console.log(`=================================\n`);
      } catch (err) {
        console.error("Error requesting pairing code:", err);
      }
    }, 4000);
  }

  // Save updated session credentials
  sock.ev.on('creds.update', saveCreds);

  // ==========================================
  // 4. CONNECTION HANDLING
  // ==========================================
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`Connection closed (code ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        startBot();
      } else {
        console.error('❌ Logged out from WhatsApp. Clear your ./session folder or update SESSION_ID.');
      }
    } else if (connection === 'open') {
      console.log('✅ LuffyTaro Bot successfully connected to WhatsApp!');
    }
  });

  // ==========================================
  // 5. INCOMING MESSAGE HANDLER & COMMANDS
  // ==========================================
  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const msg = chatUpdate.messages[0];
      if (!msg || !msg.message || msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      const body = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   msg.message.imageMessage?.caption || "";

      if (!body.trim()) return;

      const command = body.trim().toLowerCase();

      // Command: .ping
      if (command === '.ping') {
        await sock.sendMessage(remoteJid, { text: '🏓 Pong! LuffyTaro Bot is online and ready.' }, { quoted: msg });
        return;
      }

      // Command: .slots
      if (command === '.slots') {
        const slotsText = `📋 *PIRATE SCRIMS - SLOT REGISTRATION* 📋
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Slot 1: Reserve
Slot 2: Open
Slot 3: Open
Slot 4: Open
Slot 5: Open

To reserve a slot, reply with your Team Name and Payment Reference ID!`;

        await sock.sendMessage(remoteJid, { text: slotsText }, { quoted: msg });
        return;
      }

      // Command: .help
      if (command === '.help') {
        await sock.sendMessage(remoteJid, { 
          text: `🏴‍☠️ *LUFFYTARO BOT COMMANDS* 🏴‍☠️\n\n• *.slots* - View current match slots\n• *.ping* - Check bot latency\n• *.help* - Show command menu` 
        }, { quoted: msg });
        return;
      }

    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  // ==========================================
  // 6. WELCOME MESSAGE FOR NEW MEMBERS
  // ==========================================
  sock.ev.on('group-participants.update', async (participantUpdate) => {
    const { id, participants, action } = participantUpdate;

    for (const userJid of participants) {
      if (action === 'add') {
        console.log(`🏴‍☠️ New player joined group ${id}: ${userJid}`);

        const welcomeText = `🏴‍☠️ WELCOME TO PIRATE SCRIMS 🏴‍☠️
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

Ahoy, @${userJid.split('@')[0]}! You have entered the deadliest Free Fire battleground. Get your squad ready for ultimate glory!

☠️ TOURNAMENT RULES:
• No hacks / No third-party modules (Instant Ban)
• Emulators are strictly prohibited unless specified
• Team registration must match your payment receipt

💰 PAID MATCH DETAILS:
• Daily dynamic prize pools distributed via auto-payout
• Drop your team slot list by typing: .slots

Good luck, survivors! May the best squad plunder the loot. 💥`;

        const logoPath = path.join(process.cwd(), 'logo.png');

        try {
          if (fs.existsSync(logoPath)) {
            await sock.sendMessage(id, {
              image: fs.readFileSync(logoPath),
              caption: welcomeText,
              mentions: [userJid]
            });
          } else {
            await sock.sendMessage(id, {
              text: welcomeText,
              mentions: [userJid]
            });
          }
        } catch (err) {
          console.error("Failed to send welcome message:", err);
        }
      }
    }
  });
}

// Start the bot
startBot();
