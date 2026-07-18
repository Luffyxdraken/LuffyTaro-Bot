import { CONFIG } from '../config.js'; 
import { updateConfig } from '../sql/database.js'; 
import { GoogleGenAI } from '@google/genai'; // Assumes installation of standard Google Gen AI package

// Initialize Gemini Core Engine
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || CONFIG.GEMINI_KEY || "YOUR_KEY" });

const AUTHORIZED_ADMINS = [
  "917866052212", 
  "919158210010", 
  "919954865200",
  "200747358617611" 
];

export let privateUsers = []; 
let activeAdmin = "917866052212"; 
let authorizedGroups = [];

export function getActiveAdminForTime() { return activeAdmin; }
export function getAuthorizedPosterGroups() { return authorizedGroups; }

export function verifyAuthority(sender) { 
  if (!sender) return false;
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return AUTHORIZED_ADMINS.some(adminNum => cleanNum.includes(adminNum) || adminNum.includes(cleanNum));
}

export function buildLobbyMessage() {
  return `🏴‍☠️ *PIRATES LOBBY BROADCAST*\n───────────────────────────\nSlots filling fast! Drop your lineups now to secure your entry spot!`;
}

export const commands = {
  // --- 🌍 INFO TEXT DATA OUTPUTS ---
  menu: `🏴‍☠️ *LuffyTaro System Commands* 🏴‍☠️\n───────────────────────────\n• \`menu\` / \`help\` - Show this master command layout.\n• \`guidelines\` / \`rules\` - Display match rules and guidelines.\n• \`slots\` - Query open matches and available slot layouts.\n• \`tournament\` - Details regarding ongoing official tournaments.\n• \`price\` - List entry fees and pricing sheets for paid scrims.\n• \`schedule\` - View daily and weekly match timings.\n• \`payout\` - Information on prize distribution and timelines.\n• \`owner\` - Display developer connection cards.`,

  guidelines: `🏴‍☠️ *PIRATES TOURNAMENT RULES*\n───────────────────────────\n1. Strictly no emulator allowed unless explicitly noted.\n2. Hacks, scripts, or teaming up results in an instant permanent ban.\n3. Payout processing takes roughly 10-15 minutes post-match review.`,

  slots: `📊 *CURRENT SCRIM SLOTS STATUS*\n───────────────────────────\n• Match 1 (06:00 PM): 14/25 Slots Filled\n• Match 2 (08:00 PM): 19/25 Slots Filled\n• Match 3 (10:00 PM): 05/25 Slots Filled\n\n💬 Send your team lineup here to secure a position now!`,

  tournament: `🏆 *PIRATES GRAND TOURNAMENT* 🏆\n───────────────────────────\n• Pool Prize: ₹10,000 RS\n• Total Teams: 48 Lineups Max\n• Registration: Closing soon.\n\nAsk for 'price' to check structural entrance fees.`,

  price: `💰 *PAID SCRIMS PRICING STRUCTURE*\n───────────────────────────\n• Single Match Entry: ₹30 RS per lineup\n• Daily Pass (3 Matches): ₹80 RS\n• Weekly Season Pass: ₹500 RS\n\nDrop your lineup to get started right away.`,

  schedule: `⏰ *DAILY MATCH TIMETABLE*\n───────────────────────────\n• 🎮 Map 1 (Bermuda): 06:00 PM IST\n• 🎮 Map 2 (Purgatory): 08:00 PM IST\n• 🎮 Map 3 (Kalahari): 10:00 PM IST\n\nRoom details are sent out exactly 15 minutes before launch time.`,

  payout: `💸 *PRIZE DISTRIBUTION SYSTEM*\n───────────────────────────\n• Winner Take All structures clear inside 15 minutes.\n• Payments processed through UPI, GPay, and PhonePe.\n• Screenshots of placements must be dropped in the main group right as you finish.`,

  // --- 🛡️ SECURE INFRASTRUCTURE COMMANDS (Prefix Managed) ---
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

  // ==========================================
  // 🤖 THE INTELLIGENT GEMINI AI PIPELINE
  // ==========================================
  handleAiFallback: async (sock, msg, userMessage) => {
    const targetJid = msg.key.remoteJid;
    const lowerMessage = userMessage.toLowerCase().trim();
    const ownerNum = (CONFIG.OWNER_NUMBER || CONFIG.OWNER || '917866052212').replace(/[^0-9]/g, '');

    // 1. Direct Keywords mapping fallback (Fast track without hitting AI tokens)
    if (lowerMessage === 'help' || lowerMessage === 'menu') return await sock.sendMessage(targetJid, { text: commands.menu });
    if (lowerMessage === 'price') return await sock.sendMessage(targetJid, { text: commands.price });
    if (lowerMessage === 'slots') return await sock.sendMessage(targetJid, { text: commands.slots });
    if (lowerMessage === 'rules' || lowerMessage === 'guidelines') return await sock.sendMessage(targetJid, { text: commands.guidelines });
    if (lowerMessage === 'schedule') return await sock.sendMessage(targetJid, { text: commands.schedule });
    if (lowerMessage === 'tournament') return await sock.sendMessage(targetJid, { text: commands.tournament });
    if (lowerMessage === 'payout') return await sock.sendMessage(targetJid, { text: commands.payout });
    if (lowerMessage === 'owner') {
      return await sock.sendMessage(targetJid, { text: `🏴‍☠️ *BOT OWNER PROFILE*\n───────────────────────────\nManaged by: wa.me/${ownerNum}` });
    }

    // 2. High Intelligence Gemini Engine Routing
    try {
      const channelAlertInfo = `\n\n📢 *Join our Official Channel to Participate:* https://whatsapp.com/channel/200747358617611`;
      
      const aiPrompt = `
        You are LuffyTaro Bot, the smart AI assistant for "Pirates Paid Scrims". 
        Your job is to answer the user contextually in any language or slang they use (Hindi, English, Hinglish, etc.).
        
        Here is the tournament data data sheet you know:
        - Menu/Help: ${commands.menu}
        - Guidelines/Rules: ${commands.guidelines}
        - Slots info: ${commands.slots}
        - Tournament: ${commands.tournament}
        - Prices: ${commands.price}
        - Match Schedule: ${commands.schedule}
        - Payout Methods: ${commands.payout}

        If the user is saying hello, hi, greeting you, asking a question, or misspelling words (e.g. "prc", "schdule", "hlp"), classify what they want.
        - If they want a specific detail (like prices, rules, slots), summarize it or print it perfectly in character.
        - If they are greeting you or asking how to participate, answer warmly, explain things, and explicitly mention they should join the official channel.
        
        Keep your tone pirate-themed, confident, and direct. User message: "${userMessage}"
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiPrompt,
      });

      let replyText = response.text || "🏴‍☠️ Captain, my connection wavered. Try asking that again or type 'menu'!";
      
      // Force append channel reference explicitly if a greeting or participation inquiry occurs
      const greetingGaps = ['hi', 'hello', 'hey', 'join', 'parti', 'start', 'bro', 'sir', 'setup'];
      if (greetingGaps.some(word => lowerMessage.includes(word))) {
        if (!replyText.includes('200747358617611')) {
          replyText += channelAlertInfo;
        }
      }

      await sock.sendMessage(targetJid, { text: replyText });

    } catch (err) {
      console.error("Gemini Failure, using structured word match backup:", err);
      // Absolute failsafe structural keyword checker
      if (lowerMessage.includes('pric') || lowerMessage.includes('fees') || lowerMessage.includes('paisa')) {
        await sock.sendMessage(targetJid, { text: commands.price });
      } else {
        await sock.sendMessage(targetJid, { text: `🏴‍☠️ *Pirates Scrims Support*\n───────────────────────────\nHey! Drop your question or query here. You can type *menu* anytime to view pricing, timelines, slots, and schedules directly without using dots!` });
      }
    }
  }
};
