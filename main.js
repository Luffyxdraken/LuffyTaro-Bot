import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';

// Import commands and helpers from commands.js
import { 
  commands, 
  verifyAuthority, 
  getAuthorizedPosterGroups, 
  isLoopActive, 
  buildLobbyMessage 
} from './plugins/commands.js';

// Import automation handlers and toggles from automation.js
import { 
  handleGroupParticipants, 
  toggleWelcome, 
  toggleGoodbye 
} from './automation.js';

import { CONFIG } from './config.js';

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['LuffyTaro Bot', 'Chrome', '1.0.0']
  });

  // Save auth credentials whenever updated
  sock.ev.on('creds.update', saveCreds);

  // Connection Management
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('🏴‍☠️ LuffyTaro Bot is ONLINE and connected to WhatsApp!');
    }
  });

  // ==========================================
  // 👥 GROUP PARTICIPANTS AUTOMATION EVENT
  // ==========================================
  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleGroupParticipants(sock, update);
    } catch (err) {
      console.error('Error handling group participant event:', err.message);
    }
  });

  // ==========================================
  // 📩 INCOMING MESSAGES HANDLER & ROUTER
  // ==========================================
  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const msg = chatUpdate.messages[0];
      if (!msg || !msg.message || msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      const isGroup = remoteJid.endsWith('@g.us');
      const textMessage = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || "";

      if (!textMessage.trim()) return;

      const trimmedText = textMessage.trim();
      const parts = trimmedText.split(/ +/);
      const rawCommand = parts[0].toLowerCase();
      const args = parts.slice(1);

      const hasPrefix = rawCommand.startsWith(CONFIG.PREFIX);
      const cleanCommand = hasPrefix 
        ? rawCommand.slice(CONFIG.PREFIX.length) 
        : rawCommand;

      // 1. ROUTE AUTOMATION TOGGLES (.welcome & .goodbye)
      if (cleanCommand === 'welcome' && hasPrefix) {
        await toggleWelcome(sock, msg, args[0]);
        return; // Silent exit — no default menu or AI fallback
      }

      if (cleanCommand === 'goodbye' && hasPrefix) {
        await toggleGoodbye(sock, msg, args[0]);
        return; // Silent exit — no default menu or AI fallback
      }

      // 2. ROUTE REGISTERED COMMANDS
      if (hasPrefix && commands[cleanCommand]) {
        const adminOnlyCommands = ['set', 'setadmin', 'activate', 'deactivate', 'authorize', 'unauthorize', 'private', 'public', 'send', 'testpost'];
        if (adminOnlyCommands.includes(cleanCommand)) {
          const isSenderAdmin = verifyAuthority(remoteJid, msg);
          if (!isSenderAdmin) {
            await sock.sendMessage(remoteJid, { text: `❌ *ACCESS DENIED: Admin clearance required.*` });
            return;
          }
        }

        await commands[cleanCommand](sock, msg, args);
        return;
      }

      // 🛑 CRITICAL FIX: DO NOT RESPOND TO REGULAR GROUP CHAT / POSTS
      if (isGroup) {
        return; // Silent exit inside groups for normal chatter
      }

      // 3. RUN AI / FALLBACK ONLY IN PRIVATE DMs
      await commands.handleAiFallback(sock, msg, trimmedText);

    } catch (err) {
      console.error('Error processing incoming message:', err);
    }
  });

  // ==========================================
  // 📢 BROADCAST LOOP AUTOMATION (10 MINS)
  // ==========================================
  setInterval(async () => {
    try {
      if (!isLoopActive()) return;

      const authorizedGroups = getAuthorizedPosterGroups();
      if (!authorizedGroups || authorizedGroups.length === 0) return;

      const lobbyMessage = buildLobbyMessage();
      if (!lobbyMessage) return; // Skip during off-hours

      for (const groupId of authorizedGroups) {
        try {
          await sock.sendMessage(groupId, { text: lobbyMessage });
          await new Promise(resolve => setTimeout(resolve, 4000));
        } catch (postErr) {
          console.error(`Failed broadcast post to ${groupId}:`, postErr.message);
        }
      }
    } catch (err) {
      console.error('Error running broadcast loop:', err.message);
    }
  }, 10 * 60 * 1000); // 10 minutes
}

startBot();
