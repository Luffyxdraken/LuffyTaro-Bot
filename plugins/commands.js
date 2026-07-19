import { CONFIG } from '../config.js'; 
import OpenAI from 'openai';

// Safe instantiation using Groq's high-speed compatibility layer
const openai = process.env.GROQ_API_KEY ? new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
}) : null;

// 👥 MASTER ADMIN AUTHENTICATION LIST (Using strict string checks)
const AUTHORIZED_ADMINS = [
  "917866052212", // Head Owner
  "919954865200", // Shift Host 
  "919158210010"  // Backup Shift Host
];

export let privateUsers = []; 
let authorizedGroups = [];
let loopRunningStatus = true; 
const userInteractionCache = {};

// ==========================================
// 💾 LIVE CHAT DATABASE STORAGE (Editable from WhatsApp)
// ==========================================
let LIVE_SCRIM_DATABASE = {
  slots: `📊 *CURRENT SCRIM SLOTS STATUS*\n───────────────────────────\n• Match 1 (06:00 PM): 14/25 Slots Filled\n• Match 2 (08:00 PM): 19/25 Slots Filled\n• Match 3 (10:00 PM): 05/25 Slots Filled\n\n💬 Send your team lineup to secure a position now!`,
  tournament: `🏆 *PIRATES GRAND TOURNAMENT* 🏆\n───────────────────────────\n• Pool Prize: ₹10,000 RS\n• Total Teams: 48 Lineups Max\n• Registration: Closing soon.\n\nType \`price\` to check structural entrance points.`,
  price: `💰 *PAID SCRIMS PRICING STRUCTURE*\n───────────────────────────\n• Single Match Entry: ₹30 RS per lineup\n• Daily Pass (3 Matches): ₹80 RS\n• Weekly Season Pass: ₹500 RS\n\nDM host or type \`payout\` to understand transaction structures.`,
  schedule: `⏰ *DAILY MATCH TIMETABLE*\n───────────────────────────\n• 🎮 Map 1 (Bermuda): 06:00 PM IST\n• 🎮 Map 2 (Purgatory): 08:00 PM IST\n• 🎮 Map 3 (Kalahari): 10:00 PM IST\n\nRoom details are sent out exactly 15 minutes before launch time.`,
  payout: `💸 *PRIZE DISTRIBUTION SYSTEM*\n───────────────────────────\n• Winner Take All structures clear inside 15 minutes.\n• Payments processed through UPI, GPay, and PhonePe.\n• Screenshots of placements must be dropped in the main group right as you finish.`
};

// ==========================================
// ⏰ FIXED SHIFT MATRIX TIMETABLE (IST)
// ==========================================
export function getActiveAdminForTime() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const currentTimeValue = (hours * 100) + minutes; 

  // 🕒 3:00 PM to 9:00 PM IST (1500 to 2100) -> 919954865200
  if (currentTimeValue >= 1500 && currentTimeValue < 2100) {
    return "919954865200";
  } 
  // 🕒 9:00 PM to 12:00 AM Midnight IST (2100 to 2400) -> 917866052212
  else if (currentTimeValue >= 2100 && currentTimeValue <= 2359) {
    return "917866052212";
  }

  return "917866052212"; // Default Fallback
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
    `_*☠️ PIRATES™ RUSH HOUR ☠️*_\n\n*2V2 & 4V4 CUSTOM LOBBIES*\n* *ENTRY FEE - 20/50 RS*\n* *WIN PRIZE - 35/90 RS*\n\n_*DM ACTIVE HOST :- ${contactLink}*_ 🚀\n*IDP IN HAND* @all`,
    `🏴‍☠️ *PIRATES™ ULTIMATE SHOWDOWN* 🏴‍☠️\n\n> 📌 IDP IN HAND @all\n*1V1 TO 4V4 SKILL LOBBIES OPEN*\n*ENTRY - 10/20/30/50/100 RS*\n\n_*DM FOR Roster Tags :- ${contactLink}*_ 🔥`
  ];

  return variations[Math.floor(Math.random() * variations.length)];
}

export function getAuthorizedPosterGroups() { return authorizedGroups; }
export function isLoopActive() { return loopRunningStatus; }
export function toggleBroadcastLoop(status) { loopRunningStatus = status; }

// Fixed authority checks using strict equality (===)
export function verifyAuthority(sender) { 
  if (!sender) return false;
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return AUTHORIZED_ADMINS.some(adminNum => cleanNum === adminNum);
}

export function isHeadAdmin(sender) {
  if (!sender) return false;
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return cleanNum === AUTHORIZED_ADMINS[0];
}

// ==========================================
// 🛠️ COMMAND REGISTRY INDEX
// ==========================================
export const commands = {
  menu: async (sock, msg) => {
    const text = `🏴‍☠️ *LuffyTaro System Commands* 🏴‍☠️\n───────────────────────────\n` +
      `• \`.menu\` / \`.help\` - Show this master command layout.\n` +
      `• \`.guidelines\` / \`.rules\` - Display match rules.\n` +
      `• \`.slots\` - Query open matches and available slot layouts.\n` +
      `• \`.tournament\` - Details regarding ongoing official tournaments.\n` +
      `• \`.price\` - List entry fees and pricing sheets.\n` +
      `• \`.schedule\` - View daily and weekly match timings.\n` +
      `• \`.payout\` - Information on prize distribution.\n` +
      `• \`.send [number] [msg]\` - Send direct messages across inboxes.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  help: async (sock, msg) => { 
    const currentAdmin = getActiveAdminForTime();
    const text = `🚨 *PIRATES HELP DESK* 🚨\n───────────────────────────\nNeed assistance with slots, payments, or registration?\n\n💬 *Contact the Active Shift Admin immediately:* wa.me/${currentAdmin}`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  guidelines: async (sock, msg) => {
    const text = `🏴‍☠️ *PIRATES TOURNAMENT RULES*\n───────────────────────────\n1. Strictly no emulator allowed unless noted.\n2. Hacks, scripts, or teaming up results in an instant permanent ban.\n3. Payout processing takes roughly 10-15 minutes post-match review.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  rules: async (sock, msg) => { await commands.guidelines(sock, msg); },

  // Live database text fetchers
  slots: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.slots }); },
  tournament: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.tournament }); },
  price: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.price }); },
  schedule: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.schedule }); },
  payout: async (sock, msg) => { await sock.sendMessage(msg.key.remoteJid, { text: LIVE_SCRIM_DATABASE.payout }); },

  // Dynamic Content Editor (Chat Modification Mechanism)
  set: async (sock, msg, args) => {
    const targetProperty = args[0]?.toLowerCase();
    const cleanContent = args.slice(1).join(' ');

    if (!targetProperty || !LIVE_SCRIM_DATABASE.hasOwnProperty(targetProperty)) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ *Invalid Property Target!*\nUse: \`.set [slots/tournament/price/schedule/payout] [new text]\`` });
    }
    if (!cleanContent) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Text body cannot be blank.` });
    }

    LIVE_SCRIM_DATABASE[targetProperty] = cleanContent;
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Database Updated!*\nProperty *${targetProperty}* has been reconfigured in live memory.` });
  },

  send: async (sock, msg, args) => {
    const chatId = msg.key.remoteJid;
    if (args.length < 2) return;
    let rawNum = args.shift().replace(/[^0-9]/g, '');
    const msgText = args.join(' ');
    if (!rawNum.startsWith('91') && rawNum.length === 10) rawNum = '91' + rawNum;
    try {
      await sock.sendMessage(`${rawNum}@s.whatsapp.net`, { text: msgText });
    } catch (e) {}
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
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *BROADCAST LOOP ONLINE*` });
  },
  deactivate: async (sock, msg) => {
    toggleBroadcastLoop(false);
    await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ *BROADCAST LOOP HALTED*` });
  },
  status: async (sock, msg) => {
    const text = `📊 *SYSTEM STATUS REPORT*\n───────────────────────────\n• *Broadcaster Loop:* ${loopRunningStatus ? '🟢 ACTIVE' : '🔴 PAUSED'}\n• *Current Active Shift Admin:* wa.me/${getActiveAdminForTime()}\n• *Authorized Targets:* ${authorizedGroups.length} Active Groups`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  testpost: async (sock, msg) => {
    if (authorizedGroups.length === 0) return;
    const lobbyMessage = buildLobbyMessage();
    for (const groupId of authorizedGroups) {
      try { await sock.sendMessage(groupId, { text: lobbyMessage }); } catch (err) {}
    }
  },
  authorize: async (sock, msg, args) => {
    const id = args[0] || msg.key.remoteJid;
    if (!id.endsWith('@g.us')) return;
    if (!authorizedGroups.includes(id)) authorizedGroups.push(id);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Group (\`${id}\`) successfully authorized.` });
  },
  unauthorize: async (sock, msg, args) => {
    const id = args[0] || msg.key.remoteJid;
    authorizedGroups = authorizedGroups.filter(g => g !== id);
    await sock.sendMessage(msg.key.remoteJid, { text: `❌ Group authorization removed.` });
  },
  private: async (sock, msg, args) => {
    let targetNum = args[0] ? args[0].replace(/[^0-9]/g, '') : msg.key.remoteJid.split('@')[0];
    if (!targetNum) return;
    if (!targetNum.startsWith('91') && targetNum.length === 10) targetNum = '91' + targetNum;
    if (!privateUsers.includes(targetNum)) privateUsers.push(targetNum);
    await sock.sendMessage(msg.key.remoteJid, { text: `🔒 User *wa.me/${targetNum}* set to private.` });
  },
  public: async (sock, msg, args) => {
    let targetNum = args[0] ? args[0].replace(/[^0-9]/g, '') : msg.key.remoteJid.split('@')[0];
    if (!targetNum) return;
    if (!targetNum.startsWith('91') && targetNum.length === 10) targetNum = '91' + targetNum;
    privateUsers = privateUsers.filter(u => u !== targetNum);
    await sock.sendMessage(msg.key.remoteJid, { text: `🔓 User *wa.me/${targetNum}* set to public.` });
  },

  // ==========================================
  // 🤖 SMART ROUTER & STRATEGIC GROQ AI CORE
  // ==========================================
  handleAiFallback: async (sock, msg, userMessage) => {
    const targetJid = msg.key.remoteJid;
    const lowerMessage = userMessage.toLowerCase().trim();
    const channelLink = "https://whatsapp.com/channel/0029VbDEkTw9hXF0CaO0960F";
    const isSenderAdmin = verifyAuthority(msg.key.participant || msg.key.remoteJid);

    if (!userInteractionCache[targetJid]) {
      userInteractionCache[targetJid] = { interactionCount: 0 };
    }
    userInteractionCache[targetJid].interactionCount += 1;

    // 🛑 1. SYSTEM IDENTITY TRIGGERS
    if (lowerMessage.includes('who are you') || lowerMessage.includes('your name') || lowerMessage.includes('what are you') || lowerMessage.includes('who made you')) {
      const identityText = `🏴‍☠️ *LuffyTaro Automated Assistant*\n───────────────────────────\nI am the dedicated system bot for *Pirates Paid Scrims*. I manage entry configurations, schedule notifications, and slot lineups automatically inside our matches.`;
      return await sock.sendMessage(targetJid, { text: identityText });
    }

    // ⚡ PREFIX-FREE CONTEXT INTERCEPTORS (Triggers without needing a dot prefix)
    if (lowerMessage === 'help' || lowerMessage === 'admin' || lowerMessage === 'hi' || lowerMessage === 'hello') {
      return await commands.help(sock, msg);
    }
    if (lowerMessage === 'slot' || lowerMessage === 'slots') return await commands.slots(sock, msg);
    if (lowerMessage === 'tournament' || lowerMessage === 'tournaments') return await commands.tournament(sock, msg);
    if (lowerMessage === 'price' || lowerMessage === 'fee' || lowerMessage === 'pay') return await commands.price(sock, msg);
    if (lowerMessage === 'rule' || lowerMessage === 'rules' || lowerMessage === 'guideline' || lowerMessage === 'guidelines') return await commands.rules(sock, msg);
    if (lowerMessage === 'schedule' || lowerMessage === 'time' || lowerMessage === 'timetable') return await commands.schedule(sock, msg);
    if (lowerMessage === 'payout' || lowerMessage === 'win' || lowerMessage === 'prize') return await commands.payout(sock, msg);

    // 🔒 CHAT-BASED CONFIGURATION EDITOR PROTECTION ENGINE
    if (lowerMessage.startsWith('set ')) {
      if (!isSenderAdmin) {
        return await sock.sendMessage(targetJid, { text: `❌ *ACCESS DENIED*\nOnly verified admins can modify the active data matrices.` });
      }
      const args = userMessage.slice(4).trim().split(/ +/);
      return await commands.set(sock, msg, args);
    }

    // Skip formal dot commands from hitting AI fallback
    if (userMessage.startsWith(CONFIG.PREFIX)) return;

    // 🛑 3. ST STRICTLY BOXED FREE GROQ LAYER (With Topic Containment)
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'llama-3.1-8b-instant', 
          messages: [
            { 
              role: 'system', 
              content: `You are LuffyTaro Bot, the bold pirate-themed automated assistant for "Pirates Paid Scrims". 
              
              CRITICAL INTERCEPT RULE: You are completely banned from handling general queries, math problems, science queries, coding help, recipe requests, historical accounts, or talking about unrelated figures (like Albert Einstein). If a user ventures outside the operations of Pirates Paid Scrims (slots, fees, matches, rules), you must aggressively decline.
              
              Decline Response Template: "I am not allowed to discuss matters outside the Pirates Scrim Deck. Keep your questions focused on our matches, slots, or schedules!"
              
              For matching gaming scrim questions, reply short, casual, in the language/slang typed (Hindi/English/Hinglish), keeping answers under 3 lines maximum.`
            },
            { role: 'user', content: userMessage }
          ],
        });

        let replyText = completion.choices[0]?.message?.content || "";
        if (replyText) {
          const isFirstTime = userInteractionCache[targetJid].interactionCount <= 2;
          if (isFirstTime || ['join', 'link', 'group'].some(word => lowerMessage.includes(word))) {
            replyText += `\n\n📢 *Join our Official Channel to Participate:* ${channelLink}`;
          }
          return await sock.sendMessage(targetJid, { text: replyText });
        }
      } catch (err) {
        console.error("Groq AI processing error:", err.message);
      }
    }

    // 🛑 4. RANDOMIZED FALLBACK ENGINE
    const currentAdmin = getActiveAdminForTime();
    const fallbackVariations = [
      `🏴‍☠️ *Pirates Automated Scrim Support*\n───────────────────────────\nI didn't quite grasp that request, warrior. Send \`.menu\` to see our commands layout, or register directly with our active shift host at wa.me/${currentAdmin}\n\n📢 *Official Channel:* ${channelLink}`,
      `🏴‍☠️ *LuffyTaro System Alert*\n───────────────────────────\nOur registration paths are completely automated. Type \`slots\` to see open match spots, or secure tags by joining the main deck.\n\n📢 *Join Channel:* ${channelLink}`
    ];

    const randomSelection = fallbackVariations[Math.floor(Math.random() * fallbackVariations.length)];
    await sock.sendMessage(targetJid, { text: randomSelection });
  }
};
