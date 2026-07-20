import { CONFIG } from '../config.js'; 
import OpenAI from 'openai';

const openai = process.env.GROQ_API_KEY ? new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
}) : null;

// 👥 ADMIN SYSTEM ROUTING MATRIX
const AUTHORIZED_ADMINS = [
  "917866052212",      // Head Owner
  "919954865200",      // Shift Host 
  "919158210010"       // Backup Shift Host
];

export let privateUsers = []; 

// 📢 PERMANENT AUTHORIZED BROADCAST TARGETS (Groups & Channels)
let authorizedGroups = [
  "200747358617611@g.us", // Authorized Group Context ID 1
  "69652038295727@g.us",  // Authorized Group Context ID 2
  "67774785306684@g.us"   // Authorized Group Context ID 3
];

let loopRunningStatus = true; 
const userInteractionCache = {};

let LIVE_SCRIM_DATABASE = {
  slots: `📊 *CURRENT SCRIM SLOTS STATUS*\n───────────────────────────\n• Match 1 (06:00 PM): 14/25 Slots Filled\n• Match 2 (08:00 PM): 19/25 Slots Filled\n• Match 3 (10:00 PM): 05/25 Slots Filled\n\n💬 Send your team lineup to secure a position now!`,
  tournament: `🏆 *PIRATES GRAND TOURNAMENT* 🏆\n───────────────────────────\n• Pool Prize: ₹10,000 RS\n• Total Teams: 48 Lineups Max\n• Registration: Closing soon.\n\nType \`price\` to check structural entrance points.`,
  price: `💰 *PAID SCRIMS PRICING STRUCTURE*\n───────────────────────────\n• Single Match Entry: ₹30 RS per lineup\n• Daily Pass (3 Matches): ₹80 RS\n• Weekly Season Pass: ₹500 RS\n\nDM host or type \`payout\` to understand transaction structures.`,
  schedule: `⏰ *DAILY MATCH TIMETABLE*\n───────────────────────────\n• 🎮 Map 1 (Bermuda): 06:00 PM IST\n• 🎮 Map 2 (Purgatory): 08:00 PM IST\n• 🎮 Map 3 (Kalahari): 10:00 PM IST\n\nRoom details are sent out exactly 15 minutes before launch time.`,
  payout: `💸 *PRIZE DISTRIBUTION SYSTEM*\n───────────────────────────\n• Winner Take All structures clear inside 15 minutes.\n• Payments processed through UPI, GPay, and PhonePe.\n• Screenshots of placements must be dropped in the main group right as you finish.`
};

export function getActiveAdminForTime() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const currentTimeValue = (hours * 100) + minutes; 

  if (currentTimeValue >= 1045 && currentTimeValue < 1700) return "919954865200"; 
  return "917866052212"; 
}

export function buildLobbyMessage() {
  const currentAdmin = getActiveAdminForTime();
  const contactLink = `wa.me/${currentAdmin}`;
  const variations = [
    `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™*\n\n> ENTRY - 10/20/30/50/100 RS\n> PP - 18/35/55/90/180 RS\n\n*_DM ${contactLink} FOR SLOTS_* 🔥`,
    `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™* 🇮🇳\n> PAID CS LOBBY 📌\n\n_*2v2 & 3v3 & 4v4 & 1v1 LIMITED AVAILABLE*_\n\n*_DM ${contactLink} FOR SLOTS_* 🔥`
  ];
  return variations[Math.floor(Math.random() * variations.length)];
}

export function getAuthorizedPosterGroups() { return authorizedGroups; }
export function isLoopActive() { return loopRunningStatus; }
export function toggleBroadcastLoop(status) { loopRunningStatus = status; }

export function verifyAuthority(sender, msg) { 
  if (!sender) return false;
  
  const cleanSender = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  const participant = msg?.key?.participant ? msg.key.participant.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : "";
  const remoteJid = msg?.key?.remoteJid ? msg.key.remoteJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : "";

  return AUTHORIZED_ADMINS.some(adminNum => 
    cleanSender === adminNum || 
    participant === adminNum || 
    remoteJid === adminNum
  );
}

export function isHeadAdmin(sender, msg) {
  if (!sender) return false;
  const cleanSender = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return cleanSender === AUTHORIZED_ADMINS[0];
}

export const commands = {
  menu: async (sock, msg) => {
    const text = `🏴‍☠️ *LuffyTaro System Commands* 🏴‍☠️\n───────────────────────────\n` +
      `• \`.menu\` / \`.help\` - Show this master command layout.\n` +
      `• \`.slots\` - Query open matches and available slot layouts.\n` +
      `• \`.tournament\` - Details regarding ongoing official tournaments.\n` +
      `• \`.price\` - List entry fees and pricing sheets.\n` +
      `• \`.schedule\` - View daily and weekly match timings.\n` +
      `• \`.payout\` - Information on prize distribution.\n` +
      `• \`.set [slots/tournament/price...] [text]\` - Configure database settings.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  help: async (sock, msg) => { 
    const text = `🚨 *PIRATES DIRECT HELP CLEARANCE* 🚨\n───────────────────────────\n📩 *Owner/Head Management:* wa.me/917866052212\n🕒 *Afternoon Shift:* wa.me/919954865200\n\nDrop your details to the active links above.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  guidelines: async (sock, msg) => {
    const text = `🏴‍☠️ *PIRATES TOURNAMENT RULES*\n───────────────────────────\n1. Strictly no emulator allowed.\n2. Hacks/scripts result in permanent ban.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  rules: async (sock, msg) => { await commands.guidelines(sock, msg); },

  slots: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.slots }); },
  tournament: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.tournament }); },
  price: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.price }); },
  schedule: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.schedule }); },
  payout: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.payout }); },

  set: async (sock, msg, args) => {
    const targetProperty = args[0]?.toLowerCase();
    const cleanContent = args.slice(1).join(' ');

    if (!targetProperty || !LIVE_SCRIM_DATABASE.hasOwnProperty(targetProperty)) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ *Invalid Target!*\nUse: \`.set [slots/tournament/price/schedule/payout] [text]\`` });
    }
    if (!cleanContent) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Text body cannot be blank.` });

    LIVE_SCRIM_DATABASE[targetProperty] = cleanContent;
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Database Updated!*\nProperty *${targetProperty}* has been reconfigured successfully. AI knowledge updated.` });
  },

  send: async (sock, msg, args) => {
    if (args.length < 2) return;
    let rawNum = args.shift().replace(/[^0-9]/g, '');
    const msgText = args.join(' ');
    if (!rawNum.startsWith('91') && rawNum.length === 10) rawNum = '91' + rawNum;
    try { await sock.sendMessage(`${rawNum}@s.whatsapp.net`, { text: msgText }); } catch (e) {}
  },
  iamadmin: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const structuralTitle = isHeadAdmin(sender, msg) ? "👑 *HEAD SYSTEM CONTROLLER*" : "🛡️ *AUTHORIZED ADMIN CLEARANCE*";
    await sock.sendMessage(msg.key.remoteJid, { text: `${structuralTitle}\n───────────────────────────\nIdentity Verified! Admin Identifier \`${cleanNum}\` holds privileges.` });
  },
  activate: async (sock, msg) => {
    toggleBroadcastLoop(true);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *BROADCAST LOOP ONLINE*` });
  },
  deactivate: async (sock, msg) => {
    toggleBroadcastLoop(false);
    await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ *BROADCAST LOOP HALTED*` });
  },
  status: async (sock, msg) => {
    const text = `📊 *SYSTEM STATUS REPORT*\n───────────────────────────\n• *Broadcaster Loop:* ${loopRunningStatus ? '🟢 ACTIVE' : '🔴 PAUSED'}\n• *Current Active Shift Admin:* wa.me/${getActiveAdminForTime()}\n• *Authorized Targets:* ${authorizedGroups.length} Active Targets (Groups & Channels)`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  testpost: async (sock, msg) => {
    if (authorizedGroups.length === 0) return;
    const lobbyMessage = buildLobbyMessage();
    for (const targetId of authorizedGroups) {
      try { await sock.sendMessage(targetId, { text: lobbyMessage }); } catch (err) {}
    }
  },
  authorize: async (sock, msg, args) => {
    const id = args[0] || msg.key.remoteJid;
    // Allows both WhatsApp Groups (@g.us) and Channels (@newsletter)
    if (!id.endsWith('@g.us') && !id.endsWith('@newsletter')) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Invalid JID! Target must end with @g.us (Group) or @newsletter (Channel).` });
    }
    if (!authorizedGroups.includes(id)) authorizedGroups.push(id);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Target (\`${id}\`) successfully authorized for broadcasts.` });
  },
  unauthorize: async (sock, msg, args) => {
    const id = args[0] || msg.key.remoteJid;
    authorizedGroups = authorizedGroups.filter(g => g !== id);
    await sock.sendMessage(msg.key.remoteJid, { text: `❌ Authorization removed for \`${id}\`.` });
  },

  handleAiFallback: async (sock, msg, userMessage) => {
    const targetJid = msg.key.remoteJid;
    const lowerMessage = userMessage.toLowerCase().trim();

    if (!userInteractionCache[targetJid]) {
      userInteractionCache[targetJid] = { interactionCount: 0 };
    }
    userInteractionCache[targetJid].interactionCount += 1;

    if (lowerMessage.includes('who are you') || lowerMessage.includes('your name')) {
      return await sock.sendMessage(targetJid, { text: `🏴‍☠️ *LuffyTaro Automated Assistant*\nI am the system bot for *Pirates Paid Scrims*.` });
    }

    if (lowerMessage === 'help' || lowerMessage === 'admin' || lowerMessage === 'hi' || lowerMessage === 'hello') return await commands.help(sock, msg);
    if (lowerMessage === 'slot' || lowerMessage === 'slots') return await commands.slots(sock, msg);
    if (lowerMessage === 'tournament') return await commands.tournament(sock, msg);
    if (lowerMessage === 'price' || lowerMessage === 'fee') return await commands.price(sock, msg);
    if (lowerMessage === 'schedule' || lowerMessage === 'time') return await commands.schedule(sock, msg);
    if (lowerMessage === 'payout' || lowerMessage === 'win') return await commands.payout(sock, msg);

    if (userMessage.startsWith(CONFIG.PREFIX)) return;

    if (openai) {
      try {
        // Construct real-time dynamic context from LIVE_SCRIM_DATABASE
        const dynamicContext = `
Current Pirates Scrim Details:
- Slots Info: ${LIVE_SCRIM_DATABASE.slots}
- Tournament Info: ${LIVE_SCRIM_DATABASE.tournament}
- Pricing Info: ${LIVE_SCRIM_DATABASE.price}
- Timetable/Schedule: ${LIVE_SCRIM_DATABASE.schedule}
- Payouts: ${LIVE_SCRIM_DATABASE.payout}
        `.trim();

        const completion = await openai.chat.completions.create({
          model: 'llama-3.1-8b-instant', 
          messages: [
            { 
              role: 'system', 
              content: `You are LuffyTaro Bot, the energetic assistant for "Pirates Paid Scrims". Respond concisely in under 3 lines.

Use the following real-time database details to accurately answer scrim questions:
${dynamicContext}

Active Admin for manual support: wa.me/${getActiveAdminForTime()}

If a question is off-topic, decline politely with: "I am not allowed to discuss matters outside the Pirates Scrim Deck!"` 
            },
            { role: 'user', content: userMessage }
          ],
        });
        let replyText = completion.choices[0]?.message?.content || "";
        if (replyText) return await sock.sendMessage(targetJid, { text: replyText });
      } catch (err) {
        console.error("❌ Groq AI Error:", err.message);
      }
    }

    // Fallback if GROQ_API_KEY is not set or API request fails
    const fallbackMessage = `🏴‍☠️ *Pirates Support Bot*\n\nSend \`.menu\` to see available options or contact the host: wa.me/${getActiveAdminForTime()}`;
    await sock.sendMessage(targetJid, { text: fallbackMessage });
  }
};
