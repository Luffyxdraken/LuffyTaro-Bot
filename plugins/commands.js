import { CONFIG } from '../config.js'; 
import OpenAI from 'openai';

// Initialize OpenAI instance using your Render environment variable configuration
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Structural Admin Registry Track
const AUTHORIZED_ADMINS = [
  "917866052212", // Primary Head Admin Device
  "919158210010", // Secondary Admin Line
  "919954865200", // Tertiary Admin Line
  "200747358617611" 
];

export let privateUsers = []; 
let activeAdmin = "917866052212"; 
let authorizedGroups = [];
let loopRunningStatus = true; 

export function getActiveAdminForTime() { return activeAdmin; }
export function getAuthorizedPosterGroups() { return authorizedGroups; }
export function isLoopActive() { return loopRunningStatus; }
export function toggleBroadcastLoop(status) { loopRunningStatus = status; }

// Verifies if the user is anywhere in the admin registry array
export function verifyAuthority(sender) { 
  if (!sender) return false;
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return AUTHORIZED_ADMINS.some(adminNum => cleanNum.includes(adminNum) || adminNum.includes(cleanNum));
}

// Explicit check to verify if the sender is specifically your primary Head account
export function isHeadAdmin(sender) {
  if (!sender) return false;
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return cleanNum.includes(AUTHORIZED_ADMINS[0]) || AUTHORIZED_ADMINS[0].includes(cleanNum);
}

export function buildLobbyMessage() {
  return `🏴‍☠️ *PIRATES LOBBY BROADCAST*\n───────────────────────────\nSlots filling fast! Drop your lineups now!`;
}

export const commands = {
  // ──────────────────────────────────────────
  // 🌍 PUBLIC INFO COMMANDS
  // ──────────────────────────────────────────
  menu: async (sock, msg) => {
    const text = `🏴‍☠️ *LuffyTaro System Commands* 🏴‍☠️\n───────────────────────────\n• \`menu\` / \`help\` - Show this master command layout.\n• \`guidelines\` / \`rules\` - Display match rules.\n• \`slots\` - Query open match layouts.\n• \`tournament\` - Ongoing official tournament info.\n• \`price\` - List entry fees and pricing sheets.\n• \`schedule\` - View daily match timings.\n• \`payout\` - Information on prize distribution.\n\n👑 *Admin Commands* (Use \`.\` prefix):\n• \`.iamadmin\` - Verify authorization tags.\n• \`.activate\` - Turn broadcast loop ON.\n• \`.deactivate\` - Turn broadcast loop OFF.\n• \`.status\` - Get engine health metrics.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  help: async (sock, msg) => { await commands.menu(sock, msg); },

  guidelines: async (sock, msg) => {
    const text = `🏴‍☠️ *PIRATES TOURNAMENT RULES*\n───────────────────────────\n1. Strictly no emulator allowed.\n2. Hacks, scripts, or teaming up results in an instant ban.\n3. Payout processing takes roughly 10-15 minutes post-match review.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  rules: async (sock, msg) => { await commands.guidelines(sock, msg); },

  slots: async (sock, msg) => {
    const text = `📊 *CURRENT SCRIM SLOTS STATUS*\n───────────────────────────\n• Match 1 (06:00 PM): 14/25 Slots Filled\n• Match 2 (08:00 PM): 19/25 Slots Filled\n• Match 3 (10:00 PM): 05/25 Slots Filled\n\n💬 Send your team lineup here to secure a position now!`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  tournament: async (sock, msg) => {
    const text = `🏆 *PIRATES GRAND TOURNAMENT* 🏆\n───────────────────────────\n• Pool Prize: ₹10,000 RS\n• Total Teams: 48 Lineups Max\n• Registration: Closing soon.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  price: async (sock, msg) => {
    const text = `💰 *PAID SCRIMS PRICING STRUCTURE*\n───────────────────────────\n• Single Match Entry: ₹30 RS per lineup\n• Daily Pass (3 Matches): ₹80 RS\n• Weekly Season Pass: ₹500 RS`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  schedule: async (sock, msg) => {
    const text = `⏰ *DAILY MATCH TIMETABLE*\n───────────────────────────\n• 🎮 Map 1 (Bermuda): 06:00 PM IST\n• 🎮 Map 2 (Purgatory): 08:00 PM IST\n• 🎮 Map 3 (Kalahari): 10:00 PM IST\n\nRoom details are sent out exactly 15 minutes before launch time.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  payout: async (sock, msg) => {
    const text = `💸 *PRIZE DISTRIBUTION SYSTEM*\n───────────────────────────\n• Winner Take All structures clear inside 15 minutes.\n• Payments processed through UPI, GPay, and PhonePe.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  // ──────────────────────────────────────────
  // 👑 ADMIN INTERACTION & ENGINE PANELS
  // ──────────────────────────────────────────
  iamadmin: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    
    // Explicit structural identity tagging
    const structuralTitle = isHeadAdmin(sender) 
      ? "👑 *HEAD SYSTEM CONTROLLER*" 
      : "🛡️ *AUTHORIZED ADMIN CLEARANCE*";

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
    const text = `📊 *SYSTEM STATUS REPORT*\n───────────────────────────\n• **Broadcaster Loop:** ${loopRunningStatus ? '🟢 ACTIVE' : '🔴 PAUSED'}\n• **Authorized Targets:** ${authorizedGroups.length} Active Groups\n• **Ignored Privacy Targets:** ${privateUsers.length} Users`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  authorize: async (sock, msg, args) => {
    const id = args[0] || msg.key.remoteJid;
    if (!authorizedGroups.includes(id)) authorizedGroups.push(id);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Group authorized successfully.` });
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
    await sock.sendMessage(msg.key.remoteJid, { text: `🔒 User *wa.me/${targetNum}* is now set to PRIVATE.` });
  },

  public: async (sock, msg, args) => {
    let targetNum = args[0] ? args[0].replace(/[^0-9]/g, '') : msg.key.remoteJid.split('@')[0];
    if (!targetNum) return;
    if (!targetNum.startsWith('91') && targetNum.length === 10) targetNum = '91' + targetNum;
    privateUsers = privateUsers.filter(u => u !== targetNum);
    await sock.sendMessage(msg.key.remoteJid, { text: `🔓 User *wa.me/${targetNum}* is now set to PUBLIC.` });
  },

  // ──────────────────────────────────────────
  // 🤖 AI FALLBACK GATEWAY (OPENAI GPT-4O-MINI)
  // ──────────────────────────────────────────
  handleAiFallback: async (sock, msg, userMessage) => {
    const targetJid = msg.key.remoteJid;
    const lowerMessage = userMessage.toLowerCase().trim();
    const channelLink = "https://whatsapp.com/channel/0029VbDEkTw9hXF0CaO0960F";

    // hardcoded traps for context answers to lower API overhead
    if (lowerMessage.includes('who are you') || lowerMessage.includes('tum kaun ho')) {
      return await sock.sendMessage(targetJid, { text: `🏴‍☠️ *LuffyTaro Bot System*\n───────────────────────────\nI am LuffyTaro, the automated assistant built for managing *Pirates Paid Scrims*. Type *menu* to explore match configurations!\n📢 Channel: ${channelLink}` });
    }
    if (lowerMessage.includes('who made you') || lowerMessage.includes('kisne banaya')) {
      return await sock.sendMessage(targetJid, { text: `🏴‍☠️ *System Origin Metric*\n───────────────────────────\nI was created and engineered by the official **Pirates Scrims Developer Network** to automate competitive tournament traffic.\n📢 Update Log: ${channelLink}` });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', 
        messages: [
          { 
            role: 'system', 
            content: `You are LuffyTaro Bot, the bold pirate-themed automated support assistant for "Pirates Paid Scrims". 
            Answer contextually in whatever language or slang the user typed (English, Hindi, Hinglish, Bengali, etc.).
            
            Match Context Parameters:
            - Rules: Entry is ₹30/match, Daily Pass is ₹80, Season Pass is ₹500.
            - Maps: Bermuda 6PM, Purgatory 8PM, Kalahari 10PM.
            - Security: No emulators, no hacks, bans are permanent.
            - Creator: Built by the Pirates Admin Group.`
          },
          { role: 'user', content: userMessage }
        ],
      });

      let replyText = completion.choices[0]?.message?.content || "";
      if (!replyText) throw new Error("Empty OpenAI response object layout");

      const entrySignals = ['hi', 'hello', 'hey', 'join', 'scrim', 'start', 'how to participate'];
      if (entrySignals.some(word => lowerMessage.includes(word))) {
        replyText += `\n\n📢 *Join our Official Channel to Participate:* ${channelLink}`;
      }

      await sock.sendMessage(targetJid, { text: replyText });

    } catch (err) {
      console.error("OpenAI Intercept Error:", err);
      let defaultRecoveryMessage = `🏴‍☠️ *Pirates Scrims Support*\n───────────────────────────\nAhoy! My AI compass got spun around. Type *menu* to see tournament details instantly!\n📢 Official Match Link: ${channelLink}`;
      await sock.sendMessage(targetJid, { text: defaultRecoveryMessage });
    }
  }
};
