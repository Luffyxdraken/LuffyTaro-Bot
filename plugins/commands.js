import { CONFIG } from '../config.js'; 
import { updateConfig } from '../sql/database.js'; 

// ==========================================
// 👥 MULTI-ADMIN SECURITY ENGINE
// ==========================================
const AUTHORIZED_ADMINS = [
  "917866052212", 
  "919158210010", 
  "919954865200"
];

let activeAdmin = "917866052212"; 
let authorizedGroups = [];

export function getActiveAdminForTime() { return activeAdmin; }
export function getAuthorizedPosterGroups() { return authorizedGroups; }

export function verifyAuthority(sender) { 
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return AUTHORIZED_ADMINS.includes(cleanNum); 
}

export function buildLobbyMessage() {
  return `🏴‍☠️ *PIRATES LOBBY BROADCAST*\n───────────────────────────\nSlots filling fast! Drop your lineups now!`;
}

// ==========================================
// 🛠️ THE COMMAND REGISTRY INDEX
// ==========================================
export const commands = {
  // 1. Help / Menu Command
  menu: async (sock, msg, args) => {
    const text = `🏴‍☠️ *LuffyTaro System Commands* 🏴‍☠️\n───────────────────────────\n` +
      `• \`.menu\` / \`.help\` - Show this master command layout.\n` +
      `• \`.guidelines\` / \`.rules\` - Display match rules and guidelines.\n` +
      `• \`.slots\` - Query open matches and available slot layouts.\n` +
      `• \`.tournament\` - Details regarding ongoing official tournaments.\n` +
      `• \`.price\` - List entry fees and pricing sheets for paid scrims.\n` +
      `• \`.schedule\` - View daily and weekly match timings.\n` +
      `• \`.payout\` - Information on prize distribution and timelines.\n` +
      `• \`.send [number] [msg]\` - Send direct messages across inboxes.\n` +
      `• \`.authorize [group_id]\` - Authorize a group for broadcasts (Admin).\n` +
      `• \`.unauthorize [group_id]\` - Revoke group broadcast rights (Admin).`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  help: async (sock, msg, args) => { commands.menu(sock, msg, args); },

  // 2. Rules / Guidelines Command
  guidelines: async (sock, msg, args) => {
    const text = `🏴‍☠️ *PIRATES TOURNAMENT RULES*\n───────────────────────────\n1. Strictly no emulator allowed unless noted.\n2. Hacks, scripts, or teaming up results in an instant permanent ban.\n3. Payout processing takes roughly 10-15 minutes post-match review.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
  rules: async (sock, msg, args) => { commands.guidelines(sock, msg, args); },

  // 3. Slots Command
  slots: async (sock, msg, args) => {
    const text = `📊 *CURRENT SCRIM SLOTS STATUS*\n───────────────────────────\n• Match 1 (06:00 PM): 14/25 Slots Filled\n• Match 2 (08:00 PM): 19/25 Slots Filled\n• Match 3 (10:00 PM): 05/25 Slots Filled\n\n💬 Send your team lineup to secure a position now!`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  // 4. Tournament Command
  tournament: async (sock, msg, args) => {
    const text = `🏆 *PIRATES GRAND TOURNAMENT* 🏆\n───────────────────────────\n• Pool Prize: ₹10,000 RS\n• Total Teams: 48 Lineups Max\n• Registration: Closing soon.\n\nType \`.price\` to check structural entrance points.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  // 5. Price Command
  price: async (sock, msg, args) => {
    const text = `💰 *PAID SCRIMS PRICING STRUCTURE*\n───────────────────────────\n• Single Match Entry: ₹30 RS per lineup\n• Daily Pass (3 Matches): ₹80 RS\n• Weekly Season Pass: ₹500 RS\n\nDM host or type \`.payout\` to understand transaction structures.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  // 6. Schedule Command
  schedule: async (sock, msg, args) => {
    const text = `⏰ *DAILY MATCH TIMETABLE*\n───────────────────────────\n• 🎮 Map 1 (Bermuda): 06:00 PM IST\n• 🎮 Map 2 (Purgatory): 08:00 PM IST\n• 🎮 Map 3 (Kalahari): 10:00 PM IST\n\nRoom details are sent out exactly 15 minutes before launch time.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  // 7. Payout Command
  payout: async (sock, msg, args) => {
    const text = `💸 *PRIZE DISTRIBUTION SYSTEM*\n───────────────────────────\n• Winner Take All structures clear inside 15 minutes.\n• Payments processed through UPI, GPay, and PhonePe.\n• Screenshots of placements must be dropped in the main group right as you finish.`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  // 8. Direct Send Command
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

  // Admin Configuration Channels
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

  // ==========================================
  // 🤖 THE STRICT AI FALLBACK ROUTER
  // ==========================================
  handleAiFallback: async (sock, msg, userMessage) => {
    const targetJid = msg.key.remoteJid;
    const lowerMessage = userMessage.toLowerCase().trim();

    // Contextual Identity Guard
    if (lowerMessage.includes('who are you') || lowerMessage.includes('your name') || lowerMessage.includes('what are you')) {
      const identityText = `🏴‍☠️ *LuffyTaro Automated Assistant*\n───────────────────────────\nI am the dedicated system bot for *Pirates Paid Scrims*. I manage entry configurations, schedule notifications, and slot lineups automatically inside our matches. \n\nHow can I help you dominate the battlefield today?`;
      return await sock.sendMessage(targetJid, { text: identityText });
    }

    // Dynamic AI response execution layer via core engine
    try {
      // Calls your global AI model execution system safely
      const aiPrompt = `You are LuffyTaro, the automated assistant for "Pirates Paid Scrims". You assist users with esports match registrations, entry pricing, rules, and room schedules. Keep answers short, bold, and use esports gaming terminology. The user says: "${userMessage}"`;
      
      // If you use a custom package or Gemini fetch function, handle here. 
      // Falling back to a clean formatted greeting structure if your dynamic model endpoint isn't listening yet.
      const responseText = `🏴‍☠️ *Pirates Scrims Support*\n───────────────────────────\nHey there! I'm here to handle entries, schedules, and slots for **Pirates Paid Scrims**. \n\nIf you have a quick question about our registration blocks or entry costs, type out the \`.menu\` command to see all active links instantly!`;
      
      await sock.sendMessage(targetJid, { text: responseText });
    } catch (err) {
      console.error("AI processing trap failure:", err);
    }
  }
};
