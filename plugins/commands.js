import { CONFIG } from '../config.js'; 
import { GoogleGenAI } from '@google/genai';

// FIXED: Initialize the SDK with an empty configuration object to bypass the project check
// It will automatically pick up process.env.GEMINI_API_KEY safely!
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY }); 

const AUTHORIZED_ADMINS = [
  "917866052212", 
  "919158210010", 
  "919954865200",
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

export function verifyAuthority(sender) { 
  if (!sender) return false;
  const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  return AUTHORIZED_ADMINS.some(adminNum => cleanNum.includes(adminNum) || adminNum.includes(cleanNum));
}

export function buildLobbyMessage() {
  return `🏴‍☠️ *PIRATES LOBBY BROADCAST*\n───────────────────────────\nSlots filling fast! Drop your lineups now!`;
}

export const commands = {
  // --- 🌍 INFO TEXT DATA OUTPUTS ---
  menu: async (sock, msg) => {
    const text = `🏴‍☠️ *LuffyTaro System Commands* 🏴‍☠️\n───────────────────────────\n• \`menu\` / \`help\` - Show this master layout.\n• \`guidelines\` / \`rules\` - Match rules.\n• \`slots\` - Query open matches.\n• \`tournament\` - Details regarding tourneys.\n• \`price\` - Fee sheets for paid scrims.\n• \`schedule\` - Daily match timings.\n• \`payout\` - Prize distribution terms.\n\n👑 *Admin Command Panel* (Requires \`.\` prefix):\n• \`.iamadmin\` - Check authorization tags.\n• \`.activate\` - Turn broadcast loops ON.\n• \`.deactivate\` - Turn broadcast loops OFF.\n• \`.status\` - Get engine health metrics.\n• \`.private [num]\` / \`.public [num]\``;
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

  // --- 👑 ADMIN REGISTRY ENGINE ---
  iamadmin: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    const cleanNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    await sock.sendMessage(msg.key.remoteJid, { text: `🛡️ *AUTHORIZATION METRICS*\n───────────────────────────\nIdentity Verified! Admin Number \`${cleanNum}\` holds full structural management privileges.` });
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

  handleAiFallback: async (sock, msg, userMessage) => {
    const targetJid = msg.key.remoteJid;
    const lowerMessage = userMessage.toLowerCase().trim();

    if (lowerMessage === 'help' || lowerMessage === 'menu') return await commands.menu(sock, msg);
    if (lowerMessage === 'price' || lowerMessage === 'fee') return await commands.price(sock, msg);
    if (lowerMessage === 'slots') return await commands.slots(sock, msg);
    if (lowerMessage === 'rules' || lowerMessage === 'guidelines') return await commands.guidelines(sock, msg);
    if (lowerMessage === 'schedule' || lowerMessage === 'time') return await commands.schedule(sock, msg);
    if (lowerMessage === 'tournament') return await commands.tournament(sock, msg);
    if (lowerMessage === 'payout') return await commands.payout(sock, msg);

    try {
      const channelAlertInfo = `\n\n📢 *Join our Official Channel to Participate:* https://whatsapp.com/channel/200747358617611`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are LuffyTaro Bot, the dynamic pirate-themed automated support assistant for "Pirates Paid Scrims". 
        Answer contextually in whatever language or slang the user typed (English, Hindi, Hinglish, Bengali, etc.).
        
        Information sheet rules:
        - Rules: Entry is ₹30/match, Daily Pass is ₹80, Season Pass is ₹500.
        - Maps: Bermuda 6PM, Purgatory 8PM, Kalahari 10PM.
        - Security: No emulators, no hacks, bans are permanent.
        
        If the user is asking about slots, pricing, time schedules, or saying hello/hi, clarify the details concisely. Always sound bold and clear.
        User prompt text: "${userMessage}"`,
      });

      let replyText = response.text || "";
      if (!replyText) throw new Error("Empty AI response buffer");

      const introWords = ['hi', 'hello', 'hey', 'join', 'participate', 'start', 'how'];
      if (introWords.some(word => lowerMessage.includes(word)) && !replyText.includes('200747358617611')) {
        replyText += channelAlertInfo;
      }

      await sock.sendMessage(targetJid, { text: replyText });

    } catch (err) {
      console.error("AI Fallback Processing Error:", err);
      await sock.sendMessage(targetJid, { text: `🏴‍☠️ *Pirates Scrims Support*\n───────────────────────────\nHey there! Drop your question here or type *menu* to see all scrim options. To participate, follow our updates here:\n📢 https://whatsapp.com/channel/200747358617611` });
    }
  }
};
