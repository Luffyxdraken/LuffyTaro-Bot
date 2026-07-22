import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js'; 
import OpenAI from 'openai';

// Safe instantiation using Groq's high-speed compatibility layer
const openai = process.env.GROQ_API_KEY ? new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
}) : null;

// MASTER ADMIN AUTHENTICATION MATRIX
let AUTHORIZED_ADMINS = [
  "917866052212", // Head Owner
  "919954865200", // Shift Host 
  "919158210010", // Backup Shift Host
  "200747358617611", 
  "69652038295727",  
  "67774785306684"   
];

export let privateUsers = []; 
let authorizedGroups = [];
let loopRunningStatus = true; 
const userInteractionCache = {};

// ==========================================
// ⏰ DYNAMIC TIME SHIFT ADMIN MATRIX
// ==========================================
let SHIFT_ADMINS = {
  day: "919158210010",   // 10:30 AM to 3:00 PM IST
  eve: "919954865200",   // 3:00 PM to 9:00 PM IST
  night: "917866052212"  // 9:00 PM to 12:00 AM IST
};

// ==========================================
// 💾 PERSISTENT DATABASE SETUP (JSON STORAGE)
// ==========================================
const DB_PATH = path.join(process.cwd(), 'database.json');

const DEFAULT_DATABASE = {
  slots: `📊 *CURRENT SCRIM SLOTS STATUS*\n───────────────────────────\n• B2B 4 Match (12:00 PM): 0/12 Slots Filled (Upcoming)\n• B2B 4 Match (3:00 PM): 19/25 Slots Filled (Upcoming)\n• B2B 4 Match (6:00 PM): 05/25 Slots Filled (Upcoming)\n• B2B 4 Match (9:00 PM): 0/12 Slots Filled (Upcoming)\n• B2B 4 Match (12:00 AM): 0/12 Slots Filled (Upcoming)\n\n💬 Send your team lineup to secure a position now!`,
  tournament: `🏆 *PIRATES GRAND TOURNAMENT* 🏆\n───────────────────────────\n• Pool Prize: N/A\n• Total Teams: N/A\n• Registration: N/A\n\nType \`price\` to check structural entrance points.`,
  price: `💰 *PAID SCRIMS PRICING STRUCTURE*\n───────────────────────────\n• Single CS Match Entry: 10/20/30/40/50 RS per lineup\n• BR B2B (4 Matches): Upcoming \n• Free Tournament: Upcoming\n\nDM host or type \`payout\` to understand transaction structures.`,
  schedule: `⏰ *DAILY MATCH TIMETABLE*\n───────────────────────────\n• 🎮 Map 1 (Bermuda): First Match(upcoming)\n• 🎮 Map 2 (Purgatory): Second Match(upcoming)\n• 🎮 Map 3 (Kalahari): Third Match(upcoming)\n\nRoom details are sent out exactly 15 minutes before launch time.`,
  payout: `💸 *PRIZE DISTRIBUTION SYSTEM*\n───────────────────────────\n• Winner Take All structures clear inside 15 minutes.\n• Payments processed through UPI, GPay, and PhonePe.\n• Screenshots of placements must be dropped in the main group right as you finish.`
};

// Load database from file system if exists
let LIVE_SCRIM_DATABASE = { ...DEFAULT_DATABASE };
if (fs.existsSync(DB_PATH)) {
  try {
    const savedData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    LIVE_SCRIM_DATABASE = { ...DEFAULT_DATABASE, ...savedData };
  } catch (err) {
    console.error("Error reading database.json:", err.message);
  }
}

// Function to save updates directly to disk
function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(LIVE_SCRIM_DATABASE, null, 2));
  } catch (err) {
    console.error("Error saving database.json:", err.message);
  }
}

// SHIFT MATRIX TIMETABLE (IST)
export function getActiveAdminForTime() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const currentTimeValue = (hours * 100) + minutes; 

  if (currentTimeValue < 1030) return null; // Off-hours safety check

  if (currentTimeValue >= 1030 && currentTimeValue < 1500) return SHIFT_ADMINS.day;
  else if (currentTimeValue >= 1500 && currentTimeValue < 2100) return SHIFT_ADMINS.eve;
  else if (currentTimeValue >= 2100 && currentTimeValue <= 2359) return SHIFT_ADMINS.night;

  return null;
}

// BROADCAST VARIANT ROTATOR
export function buildLobbyMessage() {
  const currentAdmin = getActiveAdminForTime();
  if (!currentAdmin) return null;

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

export function verifyAuthority(sender, msg) { 
  if (!sender) return false;
  const cleanSender = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  const participant = msg?.key?.participant ? msg.key.participant.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : "";
  const remoteJid = msg?.key?.remoteJid ? msg.key.remoteJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : "";

  return AUTHORIZED_ADMINS.some(adminNum => 
    cleanSender === adminNum || 
    (participant && participant === adminNum) || 
    (remoteJid && remoteJid === adminNum)
  );
}

export function isHeadAdmin(sender, msg) {
  if (!sender) return false;
  const cleanSender = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  const participant = msg?.key?.participant ? msg.key.participant.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : "";
  
  return cleanSender === AUTHORIZED_ADMINS[0] || (participant && participant === AUTHORIZED_ADMINS[0]);
}

// COMMAND REGISTRY
export const commands = {
  menu: async (sock, msg) => {
    const text = `🏴‍☠️ *LuffyTaro System Commands* 🏴‍☠️\n───────────────────────────\n` +
      `• \`.menu\` / \`.help\` - Show this master command layout.\n` +
      `• \`.slots\` - Query open matches and available slot layouts.\n` +
      `• \`.tournament\` - Details regarding ongoing official tournaments.\n` +
      `• \`.price\` - List entry fees and pricing sheets.\n` +
      `• \`.schedule\` - View daily and weekly match timings.\n` +
      `• \`.payout\` - Information on prize distribution.\n` +
      `• \`.set [slots/tournament/price/schedule/payout] [text]\` - Permanent database update.\n` +
      `• \`.setadmin [day/eve/night] [num]\` - Dynamically update shift host.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  help: async (sock, msg) => { 
    const currentHost = getActiveAdminForTime();
    const text = `🚨 *PIRATES DIRECT HELP CLEARANCE* 🚨\n───────────────────────────\n` +
      `📩 *Current Active Shift Host:* ${currentHost ? `wa.me/${currentHost}` : 'Off-hours (Opens at 10:30 AM IST)'}\n` +
      `👑 *Head Management:* wa.me/${SHIFT_ADMINS.day}\n\n` +
      `Drop your team tags or receipt confirmations directly to the active links above.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  guidelines: async (sock, msg) => {
    const text = `🏴‍☠️ *PIRATES TOURNAMENT RULES*\n───────────────────────────\n1. Strictly no emulator allowed unless noted.\n2. Hacks, scripts, or teaming up results in an instant permanent ban.\n3. Payout processing takes roughly 10-15 minutes post-match review.`;
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
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ *Invalid Property Target!*\nUse: \`.set [slots/tournament/price/schedule/payout] [new text]\`` });
    }
    if (!cleanContent) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Text body cannot be blank.` });
    }

    LIVE_SCRIM_DATABASE[targetProperty] = cleanContent;
    saveDatabase();

    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Database Updated & Saved Permanently!*\nProperty *${targetProperty}* has been updated and will stay saved even after a restart.` });
  },

  setadmin: async (sock, msg, args) => {
    const shift = args[0]?.toLowerCase();
    let rawNum = args[1]?.replace(/[^0-9]/g, '');

    if (!shift) {
      const currentOverview = `⏰ *CURRENT SHIFT HOST SCHEDULE*\n───────────────────────────\n` +
        `• *Day (10:30 AM - 3:00 PM):* wa.me/${SHIFT_ADMINS.day}\n` +
        `• *Eve (3:00 PM - 9:00 PM):* wa.me/${SHIFT_ADMINS.eve}\n` +
        `• *Night (9:00 PM - 12:00 AM):* wa.me/${SHIFT_ADMINS.night}\n\n` +
        `💡 *To change a host number:* \`.setadmin [day/eve/night] [number]\``;
      return await sock.sendMessage(msg.key.remoteJid, { text: currentOverview });
    }

    if (!['day', 'eve', 'night'].includes(shift)) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ *Invalid shift parameter!* Use \`day\`, \`eve\`, or \`night\`.` });
    }

    if (!rawNum) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Please provide a valid phone number.` });
    }

    if (!rawNum.startsWith('91') && rawNum.length === 10) rawNum = '91' + rawNum;

    SHIFT_ADMINS[shift] = rawNum;
    if (!AUTHORIZED_ADMINS.includes(rawNum)) AUTHORIZED_ADMINS.push(rawNum);

    const labels = {
      day: "Morning/Day (10:30 AM - 3:00 PM)",
      eve: "Afternoon/Evening (3:00 PM - 9:00 PM)",
      night: "Night (9:00 PM - 12:00 AM)"
    };

    await sock.sendMessage(msg.key.remoteJid, { 
      text: `✅ *SHIFT ADMIN UPDATED!*\n───────────────────────────\n• *Shift:* ${labels[shift]}\n• *New Host:* wa.me/${rawNum}` 
    });
  },

  send: async (sock, msg, args) => {
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
    const structuralTitle = isHeadAdmin(sender, msg) ? "👑 *HEAD SYSTEM CONTROLLER*" : "🛡️ *AUTHORIZED ADMIN CLEARANCE*";
    await sock.sendMessage(msg.key.remoteJid, { 
      text: `${structuralTitle}\n───────────────────────────\nIdentity Verified! Admin Identifier \`${cleanNum}\` holds full structural management privileges.` 
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
    const currentHost = getActiveAdminForTime();
    const text = `📊 *SYSTEM STATUS REPORT*\n───────────────────────────\n• *Broadcaster Loop:* ${loopRunningStatus ? '🟢 ACTIVE' : '🔴 PAUSED'}\n• *Current Active Shift Admin:* ${currentHost ? `wa.me/${currentHost}` : 'Off-hours (Inactive)'}\n• *Authorized Targets:* ${authorizedGroups.length} Active Groups`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  testpost: async (sock, msg) => {
    if (authorizedGroups.length === 0) return;
    const lobbyMessage = buildLobbyMessage();
    if (!lobbyMessage) {
      return await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Cannot generate test post outside active broadcast hours (10:30 AM - 12:00 AM IST).` });
    }
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (const groupId of authorizedGroups) {
      try { 
        await sock.sendMessage(groupId, { text: lobbyMessage });
        await sleep(3500); 
      } catch (err) {}
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

  handleAiFallback: async (sock, msg, userMessage) => {
    const targetJid = msg.key.remoteJid;
    const lowerMessage = userMessage.toLowerCase().trim();
    const channelLink = "https://whatsapp.com/channel/0029VbDEkTw9hXF0CaO0960F";
    const isSenderAdmin = verifyAuthority(msg.key.remoteJid, msg);

    if (!userInteractionCache[targetJid]) {
      userInteractionCache[targetJid] = { interactionCount: 0 };
    }
    userInteractionCache[targetJid].interactionCount += 1;

    if (lowerMessage.includes('who are you') || lowerMessage.includes('your name') || lowerMessage.includes('what are you') || lowerMessage.includes('who made you')) {
      const identityText = `🏴‍☠️ *LuffyTaro Automated Assistant*\n───────────────────────────\nI am the dedicated system bot for *Pirates Paid Scrims*. I manage entry configurations, schedule notifications, and slot lineups automatically inside our matches.`;
      return await sock.sendMessage(targetJid, { text: identityText });
    }

    if (lowerMessage === 'help' || lowerMessage === 'admin' || lowerMessage === 'hi' || lowerMessage === 'hello') return await commands.help(sock, msg);
    if (lowerMessage === 'slot' || lowerMessage === 'slots') return await commands.slots(sock, msg);
    if (lowerMessage === 'tournament' || lowerMessage === 'tournaments') return await commands.tournament(sock, msg);
    if (lowerMessage === 'price' || lowerMessage === 'fee' || lowerMessage === 'pay') return await commands.price(sock, msg);
    if (lowerMessage === 'rule' || lowerMessage === 'rules' || lowerMessage === 'guideline' || lowerMessage === 'guidelines') return await commands.rules(sock, msg);
    if (lowerMessage === 'schedule' || lowerMessage === 'time' || lowerMessage === 'timetable') return await commands.schedule(sock, msg);
    if (lowerMessage === 'payout' || lowerMessage === 'win' || lowerMessage === 'prize') return await commands.payout(sock, msg);

    if (lowerMessage.startsWith('set ')) {
      if (!isSenderAdmin) return await sock.sendMessage(targetJid, { text: `❌ *ACCESS DENIED*` });
      const args = userMessage.slice(4).trim().split(/ +/);
      return await commands.set(sock, msg, args);
    }

    if (userMessage.startsWith(CONFIG.PREFIX)) return;

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'llama-3.1-8b-instant', 
          messages: [
            { 
              role: 'system', 
              content: `You are LuffyTaro Bot, the bold pirate-themed assistant for "Pirates Paid Scrims". Strictly handle scrim queries only.` 
            },
            { role: 'user', content: userMessage }
          ],
        });

        let replyText = completion.choices[0]?.message?.content || "";
        if (replyText) {
          const isFirstTime = userInteractionCache[targetJid].interactionCount <= 2;
          if (isFirstTime || ['join', 'link', 'group'].some(word => lowerMessage.includes(word))) {
            replyText += `\n\n📢 *Join our Official Channel:* ${channelLink}`;
          }
          return await sock.sendMessage(targetJid, { text: replyText });
        }
      } catch (err) {}
    }

    const fallbackVariations = [
      `🏴‍☠️ *Pirates Automated Scrim Support*\n───────────────────────────\nType *help* to contact our direct shift host links right away.\n\n📢 *Official Channel:* ${channelLink}`
    ];
    await sock.sendMessage(targetJid, { text: fallbackVariations[0] });
  }
};
