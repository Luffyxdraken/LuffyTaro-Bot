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
// 2. MAIN BOT FUNCTION
// ==========================================
async function startBot() {
  // Save/Load session from local ./session folder
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04']
  });

  // ==========================================
  // 3. PAIRING CODE GENERATOR
  // ==========================================
  if (!sock.authState.creds.registered) {
    const phoneNumber = "919382276556"; // Your WhatsApp number

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

  // Save session credentials
  sock.ev.on('creds.update', saveCreds);

  // ==========================================
  // 4. CONNECTION HANDLING
  // ==========================================
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ LuffyTaro Bot successfully connected to WhatsApp!');
    }
  });

  // ==========================================
  // 5. WELCOME MESSAGE FOR NEW MEMBERS
  // ==========================================
  sock.ev.on('group-participants.update', async (participantUpdate) => {
    const { id, participants, action } = participantUpdate;

    for (const userJid of participants) {
      if (action === 'add') {
        console.log(`🏴‍☠️ New player joined group ${id}:${userJid}`);

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
          // Send with logo picture if logo.png exists in root folder
          if (fs.existsSync(logoPath)) {
            await sock.sendMessage(id, {
              image: fs.readFileSync(logoPath),
              caption: welcomeText,
              mentions: [userJid]
            });
          } else {
            // Fallback to text message if logo isn't uploaded yet
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
