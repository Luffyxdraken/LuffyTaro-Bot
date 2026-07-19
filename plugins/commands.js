import { CONFIG } from '../config.js'; 
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 👥 MULTI-ADMIN SECURITY ENGINE
const AUTHORIZED_ADMINS = [
  "917866052212", 
  "919158210010", 
  "919954865200", 
  "200747358617611"
];

export let privateUsers = []; 
let authorizedGroups = [];
let loopRunningStatus = true; 

const userInteractionCache = {};

// ==========================================
// ⏰ TIME-BASED SHIFT SCHEDULE
// ==========================================
export function getActiveAdminForTime() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const currentTimeValue = (hours * 100) + minutes; 

  // Shift 1: 10:30 AM to 02:45 PM (14:45)
  if (currentTimeValue >= 1030 && currentTimeValue <= 1445) {
    return "919158210010";
  }
  // Shift 2: 05:00 PM (17:00) to 07:15 PM (19:15)
  else if (currentTimeValue >= 1700 && currentTimeValue <= 1915) {
    return "917866052212";
  }
  // Shift 3: 07:30 PM (19:30) to 09:45 PM (21:45)
  else if (currentTimeValue >= 1930 && currentTimeValue <= 2145) {
    return "919954865200";
  }

  return "917866052212";
}

// ==========================================
// 🔄 DYNAMIC BROADCAST VARIANT ROTATOR
// ==========================================
export function buildLobbyMessage() {
  const currentAdmin = getActiveAdminForTime();
  const contactLink = `wa.me/${currentAdmin}`;

  const variations = [
    `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™*\n\n> ENTRY - 10/20/30/50/100 RS\n> PP - 18/35/55/90/180 RS\n\n*_DM ${contactLink} FOR SLOTS_* 🔥`,
    
    `🏴‍☠️ *10x PP LOBBY* 🏴‍☠️\n*PIRATES™* 🇮🇳\n> PAID CS LOBBY 📌\n\n_*2v2 & 3v3 & 4v4 & 1v1 LIMITED AVAILABLE*_\n\n*_DM ${contactLink} FOR SLOTS_* 🔥`,
    
    `_*☠️ Pirates CS Paid Scrims ☠️*_\n\n\n*1V1/2V2/3V3/4V4  BODY  UNLIMITED*\n\n*SKILL ON*\n\n* *ENTRY- 10/20/30/50/100 RS*\n* *WIN - 18/35/55/90/180 RS*\n\n_*DM :- ${contactLink}*_\n*IDP IN HAND* @all`,
    
    `🏴‍☠️ *PIRATES™ COMBAT DECK* 🏴‍☠️\n\n> CS FAST SLOTS RUNNING ⚡\n*1v1 2v2 3v3 4v4 MAP SQUADS*\n*ENTRY: 10 to 100 RS | instant prize pools*\n\n_*PING FAST:- ${contactLink}*_ @all`,
    
    `☠️ *PIRATES™ CASH SCRIMS* ☠️\n\n> 📌 HIGH SKILL CUSTOMS\n* *10 RS ➡️ 18 RS*\n* *30 RS ➡️ 55 RS*\n* *100 RS ➡️ 180 RS*\n\n_*DM FOR INSTANT SLOTS :- ${contactLink}*_ 🔥`,
    
    `🏴‍☠️ *10x PP SQUAD LOBBY* 🏴‍☠️\n*PIRATES™ OFFICIATING*\n\n> CS BODY & BUILD UNLIMITED 💎\n_*LIMITED GRIDS LEFT IN HAND*_\n\n_*BOOK INBOX NOW :- ${contactLink}*_`,
    
    `_*☠️ PIRATES™ RUSH HOUR ☠️*_\n\n*2V2 & 4V4 CUSTOM LOBBIES*\n* *ENTRY FEE - 20/50 RS*\n* *WIN PRIZE - 35/90 RS*\n\n_*DM ACTIVE HOST :- ${contactLink}*_ 🚀`,
    
    `🏴‍☠️ *PIRATES™ ULTIMATE SHOWDOWN* 🏴‍☠️\n\n> 📌 IDP IN HAND @all\n*1V1 TO 4V4 SKILL LOBBIES OPEN*\n*ENTRY - 10/20/30/50/100 RS*\n\n_*DM FOR Roster Tags :- ${contactLink}*_ 🔥`
  ];

  // Pick a random template layout from the array (0 to 7)
  const randomIndex = Math.floor(Math.random() * variations.length);
  return variations[randomIndex];
}

export function getAuthorizedPosterGroups() { return authorizedGroups; }
export function isLoopActive() { return loopRunningStatus; }
export function toggleBroadcastLoop(status) { loopRunningStatus = status; }

export function verifyAuthority(sender) { 
  if (!sender) return false;
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return AUTHORIZED_ADMINS.some(adminNum => cleanNum.includes(adminNum) || adminNum.includes(cleanNum));
}

export function isHeadAdmin(sender) {
  if (!sender) return false;
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return cleanNum.includes(AUTHORIZED_ADMINS[0]) || AUTHORIZED_ADMINS[0].includes(cleanNum);
}

// ==========================================
// 🛠️ COMMAND REGISTRY INDEX
// ==========================================
export const commands = {
  menu: async (sock, msg) => {
    const text = `🏴‍☠️ *LuffyTaro System Commands* 🏴‍☠️\n───────────────────────────\n` +
      `• \`.menu\` / \`.help\` - Show this master command layout.\n` +
      `• \`.guidelines\` / \`.rules\` - Display match rules and guidelines.\n` +
      `• \`.slots\` - Query open matches and available slot layouts.\n` +
      `• \`.tournament\` - Details regarding ongoing official tournaments.\n` +
      `• \`.price\` - List entry fees and pricing sheets for paid scrims.\n` +
      `• \`.schedule\` - View daily and weekly match timings.\n` +
      `• \`.payout\` - Information on prize distribution and timelines.\n` +
      `• \`.send [number] [msg]\` - Send direct messages across inboxes.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  help: async (sock, msg) => { await commands.menu(sock, msg); },

  guidelines: async (sock, msg) => {
    const text = `🏴‍☠️ *PIRATES TOURNAMENT RULES*\n───────────────────────────\n1. Strictly no emulator allowed unless noted.\n2. Hacks, scripts, or teaming up results in an instant permanent ban.\n3. Payout processing takes roughly 10-15 minutes post-match review.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  rules: async (sock, msg) => { await commands.guidelines(sock, msg); },

  slots: async (sock, msg) => {
    const text = `📊 *CURRENT SCRIM SLOTS STATUS*\n───────────────────────────\n• Match 1 (06:00 PM): 14/25 Slots Filled\n• Match 2 (08:00 PM): 19/25 Slots Filled\n• Match 3 (10:00 PM): 05/25 Slots Filled\n\n💬 Send your team lineup to secure a position now!`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  tournament: async (sock, msg) => {
    const text = `🏆 *PIRATES GRAND TOURNAMENT* 🏆\n───────────────────────────\n• Pool Prize: ₹10,000 RS\n• Total Teams: 48 Lineups Max\n• Registration: Closing soon.\n\nType \`.price\` to check structural entrance points.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  price: async (sock, msg) => {
    const text = `💰 *PAID SCRIMS PRICING STRUCTURE*\n───────────────────────────\n• Single Match Entry: ₹30 RS per lineup\n• Daily Pass (3 Matches): ₹80 RS\n• Weekly Season Pass: ₹500 RS\n\nDM host or type \`.payout\` to understand transaction structures.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  schedule: async (sock, msg) => {
    const text = `⏰ *DAILY MATCH TIMETABLE*\n───────────────────────────\n• 🎮 Map 1 (Bermuda): 06:00 PM IST\n• 🎮 Map 2 (Purgatory): 08:00 PM IST\n• 🎮 Map 3 (Kalahari): 10:00 PM IST\n\nRoom details are sent out exactly 15 minutes before launch time.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  payout: async (sock, msg) => {
    const text = `💸 *PRIZE DISTRIBUTION SYSTEM*\n───────────────────────────\n• Winner Take All structures clear inside 15 minutes.\n• Payments processed through UPI, GPay, and PhonePe.\n• Screenshots of placements must be dropped in the main group right as you finish.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  send: async (sock, msg, args) => {
    const chatId = msg.key.remoteJid;
    if (args.length < 2) {
      return await sock.sendMessage(chatId, { text: `💡 *Usage:* \`.send [phone_number] [message]\`\nExample: \`.send 917866052212 Hello!\`` });
    }
    let rawNum = args.shift().replace(/[^0-9]/g, '');
    const msgText = args.join(' ');
    if (!rawNum.startsWith('91') && rawNum.length === 10) rawNum = '91' + rawNum;
    
    try {
      await sock.sendMessage(`${rawNum}@s.whatsapp.net`, { text: msgText });
      await sock.sendMessage(chatId, { text: `🚀 Message successfully delivered straight to *wa.me/${rawNum}*!` });
    } catch (e) {
      await sock.sendMessage(chatId, { text: `❌ Delivery failed.` });
    }
  },

  iamadmin: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const structuralTitle = isHeadAdmin(sender) ? "👑 *HEAD SYSTEM CONTROLLER*" : "🛡️ *AUTHORIZED ADMIN CLEARANCE*";
    await sock.sendMessage(msg.key.remoteJid, { 
      text: `${structuralTitle}\n───────────────────────────\nIdentity Verified! Admin Number \`${cleanNum}\` holds full structural management privileges.` 
    });
  },

  activate: async (sock, msg) => {
    toggleBroadcastLoop(true);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *BROADCAST LOOP ONLINE*\n───────────────────────────\nThe automated 15-minute matchmaking lobby loop engine has been successfully started.` });
  },

  deactivate: async (sock, msg) => {
    toggleBroadcastLoop(false);
    await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ *BROADCAST LOOP HALTED*\n───────────────────────────\nThe automated 15-minute matchmaking lobby loop engine has been paused.` });
  },

  status: async (sock, msg) => {
    const text = `📊 *SYSTEM STATUS REPORT*\n───────────────────────────\n• *Broadcaster Loop:* ${loopRunningStatus ? '🟢 ACTIVE' : '🔴 PAUSED'}\n• *Current Active Shift Admin:* wa.me/${getActiveAdminForTime()}\n• *Authorized Targets:* ${authorizedGroups.length} Active Groups\n• *Ignored Privacy Targets:* ${privateUsers.length} Users`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  testpost: async (sock, msg) => {
    if (authorizedGroups.length === 0) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ *TESTPOST WARNING*\n───────────────────────────\nNo groups have been authorized yet! Use \`.authorize\` inside a group first.` });
    }
    const lobbyMessage = buildLobbyMessage();
    await sock.sendMessage(msg.key.remoteJid, { text: `⏳ Launching instant test post broadcast across ${authorizedGroups.length} groups...` });
    
    for (const groupId of authorizedGroups) {
      try {
        await sock.sendMessage(groupId, { text: lobbyMessage });
      } catch (err) {
        console.error(`Failed to test-post to ${groupId}:`, err.message);
      }
    }
  },

  authorize: async (sock, msg, args) => {
    const id = args[0] || msg.key.remoteJid;
    if (!id.endsWith('@g.us')) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Target ID must be a group JID ending in @g.us` });
    }
    if (!authorizedGroups.includes(id)) authorizedGroups.push(id);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Group (\`${id}\`) successfully authorized for the 15-minute broadcast loop.` });
  },
  
  unauthorize: async (sock, msg, args) => {
    const id = args[0] || msg.key.remoteJid;
    authorizedGroups = authorizedGroups.filter(g => g !== id);
    await sock.sendMessage(msg.key.remoteJid, { text: `❌ Group authorization removed. Loop tracking disabled for this target.` });
  },

  private: async (sock, msg, args) => {
    let targetNum = args[0] ? args[0].replace(/[^0-9]/g, '') : msg.key.remoteJid.split('@')[0];
    if (!targetNum) return;
    if (!targetNum.startsWith('91') && targetNum.length === 10) targetNum = '91' + targetNum;
    if (!privateUsers.includes(targetNum)) privateUsers.push(targetNum);
    await sock.sendMessage(msg.key.remoteJid, { text: `🔒 User *wa.me/${targetNum}* is now set to *PRIVATE*. The bot will ignore their direct messages.` });
  },

  public: async (sock, msg, args) => {
    let targetNum = args[0] ? args[0].replace(/[^0-9]/g, '') : msg.key.remoteJid.split('@')[0];
    if (!targetNum) return;
    if (!targetNum.startsWith('91') && targetNum.length === 10) targetNum = '91' + targetNum;
    privateUsers = privateUsers.filter(u => u !== targetNum);
    await sock.sendMessage(msg.key.remoteJid, { text: `🔓 User *wa.me/${targetNum}* is now set to *PUBLIC*. The bot will respond to them normally.` });
  },

  // ==========================================
  // 🤖 THE STABILIZED AI FALLBACK ROUTER
  // ==========================================
  handleAiFallback: async (sock, msg, userMessage) => {
    const targetJid = msg.key.remoteJid;
    const lowerMessage = userMessage.toLowerCase().trim();
    const channelLink = "https://whatsapp.com/channel/0029VbDEkTw9hXF0CaO0960F";

    if (!userInteractionCache[targetJid]) {
      userInteractionCache[targetJid] = { interactionCount: 0 };
    }
    userInteractionCache[targetJid].interactionCount += 1;

    if (lowerMessage.includes('who are you') || lowerMessage.includes('your name') || lowerMessage.includes('what are you')) {
      const identityText = `🏴‍☠️ *LuffyTaro Automated Assistant*\n───────────────────────────\nI am the dedicated system bot for *Pirates Paid Scrims*. I manage entry configurations, schedule notifications, and slot lineups automatically inside our matches.`;
      return await sock.sendMessage(targetJid, { text: identityText });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', 
        messages: [
          { 
            role: 'system', 
            content: `You are LuffyTaro Bot, the bold pirate-themed automated support assistant for "Pirates Paid Scrims". 
            Answer contextually in whatever language or slang the user typed (English, Hindi, Hinglish, Bengali, etc.).`
          },
          { role: 'user', content: userMessage }
        ],
      });

      let replyText = completion.choices[0]?.message?.content || "";
      if (!replyText) throw new Error("Empty OpenAI response parsing block.");

      const isFirstTime = userInteractionCache[targetJid].interactionCount <= 2;
      const structuralSignals = ['hi', 'hello', 'hey', 'join', 'scrim', 'start', 'how to participate', 'what is this', 'about'];
      const explicitlyAskingIntro = structuralSignals.some(word => lowerMessage.includes(word));

      if (isFirstTime || explicitlyAskingIntro) {
        replyText += `\n\n📢 *Join our Official Channel to Participate:* ${channelLink}`;
      }

      await sock.sendMessage(targetJid, { text: replyText });

    } catch (err) {
      console.error("OpenAI Fallback Error Intercepted:", err.message);
      const responseText = `🏴‍☠️ *Pirates Scrims Support*\n───────────────────────────\nHey there! I'm here to handle entries, schedules, and slots for **Pirates Paid Scrims**.`;
      await sock.sendMessage(targetJid, { text: responseText });
    }
  }
};
