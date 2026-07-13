import { getConfig } from '../sql/database.js';
import { CONFIG } from '../config.js';

// In-Memory Database Fallbacks
let adminList = new Set(); 
let activeMatchStaging = null;
let mainGroupJid = null; // Stores your absolute main group JID node

let dynamicPresets = {
  pirates_paid_scrim: {
    imageUrl: "https://i.imgur.com/8K6Zg8b.png",
    caption: "🏴‍☠️ *PIRATES PAID SCRIMS* 🏴‍☠️\n\nWelcome to the supreme arena. Play hard, earn fast, claim victory cleanly."
  }
};

// Time Engine for Administrative Shift Rotations (IST)
export function getActiveAdminForTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5)); 
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = (hours * 60) + minutes;

  if (timeInMinutes >= (10 * 60 + 30) && timeInMinutes <= (14 * 60 + 45)) return "919158210010";
  if (timeInMinutes >= (15 * 60 + 30) && timeInMinutes <= (20 * 60 + 45)) return "9954865200";
  if (timeInMinutes >= (21 * 60 + 30) && timeInMinutes <= (23 * 60 + 45)) return "7866052212";
  return null;
}

// Authority Check Utility
function verifyAuthority(senderJid, requireRoot = false) {
  const dynamicCleanNum = senderJid.split('@')[0];
  const rootCleanNum = CONFIG.OWNER.split('@')[0];
  
  if (dynamicCleanNum === rootCleanNum) return true;
  if (requireRoot) return false; 
  return adminList.has(dynamicCleanNum);
}

// 🤖 Simulating an AI Response Generator formatted perfectly to your theme
async function askGeminiAI(playerPrompt) {
  // In your production, you can replace this with a real fetch() to your Gemini API key endpoint
  return `🏴‍☠️ *PIRATES AI ASSISTANT* 🏴‍☠️\n\nRegarding your question: "${playerPrompt}"...\n\n_Our professional ruling is simple: All tournament brackets, payments, and slots are managed directly via our timed administrative windows. Please contact the active shift manager if you require further custom ledger updates!_`;
}

export const commands = {
  // 👑 Master Security Infrastructure
  addadmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Security Denial.*" });
    if (!args[0]) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Usage: `.addadmin 91XXXXXXXXXX`" });
    
    const targetAdmin = args[0].replace(/[^0-9]/g, '');
    adminList.add(targetAdmin);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Clearance Granted:* +${targetAdmin} is now a sub-admin.` });
  },

  deladmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Security Denial.*" });
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (targetAdmin === CONFIG.OWNER.split('@')[0]) return await sock.sendMessage(msg.key.remoteJid, { text: "🛡️ Root Owner cannot be deleted." });
    
    if (adminList.has(targetAdmin)) {
      adminList.delete(targetAdmin);
      await sock.sendMessage(msg.key.remoteJid, { text: `🗑️ Removed sub-admin +${targetAdmin}.` });
    }
  },

  // 📍 Tell the bot which group is your main hub
  setmaingroup: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    if (!msg.key.remoteJid.endsWith('@g.us')) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Run this command inside your *Main Group* hub!" });

    mainGroupJid = msg.key.remoteJid;
    await sock.sendMessage(msg.key.remoteJid, { text: "🏴‍☠️ *System Anchor Locked:* This group has been saved as your main hub." });
  },

  // 🏁 Staging a match
  startresult: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const eventName = args[0];
    const matchId = args[1];
    let groupLink = args[2];
    if (!eventName || !matchId || !groupLink) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ `.startresult [Event] [MatchID] [GroupLink]`" });

    if (groupLink.includes('chat.whatsapp.com/')) groupLink = groupLink.split('chat.whatsapp.com/')[1].trim();
    activeMatchStaging = { eventName, matchId, targetGroupMetadata: groupLink };
    await sock.sendMessage(msg.key.remoteJid, { text: `🏁 *Match Staged:* Linked to target room ID code: ${groupLink}` });
  },

  // 📊 Smart Multi-Channel Dispatch Engine
  send: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    if (!activeMatchStaging) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Staging blank. Run `.startresult` first." });
    if (!mainGroupJid) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Warning: Set your main hub group first using `.setmaingroup` inside it." });

    await sock.sendMessage(msg.key.remoteJid, { text: `📊 *Executing smart results dispatch...*` });
    try {
      let matchGroupJid = activeMatchStaging.targetGroupMetadata;
      if (!matchGroupJid.endsWith('@g.us')) matchGroupJid = await sock.groupAcceptInvite(activeMatchStaging.targetGroupMetadata);
      
      const matchMeta = await sock.groupMetadata(matchGroupJid);
      const matchPlayers = matchMeta.participants.map(p => p.id);

      // Fetch Main Hub invite code dynamically to provide fallback invite links
      const mainGroupInviteCode = await sock.groupInviteCode(mainGroupJid);
      const mainGroupLink = `https://chat.whatsapp.com/${mainGroupInviteCode}`;

      for (const playerJid of matchPlayers) {
        const isWinner = Math.random() > 0.5; // Simulated placement tracking
        
        let payloadText = isWinner 
          ? `🏴‍☠️ *PIRATES PAID SCRIMS WINNER VERDICT* 🏆\n\nCongratulations! Your team won *${activeMatchStaging.eventName} (${activeMatchStaging.matchId})*.\n\n⚡ Payout processing initialized. Clear in 10 mins!`
          : `🏴‍☠️ *PIRATES PAID SCRIMS COMBAT UPDATE* ⚔️\n\nHard luck warrior! You competed inside *${activeMatchStaging.eventName} (${activeMatchStaging.matchId})*, but missed top position. See you in the next lobby!`;

        // Check if player is present in your main hub group
        const mainMeta = await sock.groupMetadata(mainGroupJid);
        const isPlayerInMainGroup = mainMeta.participants.some(p => p.id === playerJid);

        // 🔗 Fallback Logic: If they aren't in the main group, append the invitation link!
        if (!isPlayerInMainGroup) {
          payloadText += `\n\n⚠️ *Notice:* We noticed you aren't in our primary community group hub yet. Click here to join up and track updates live: ${mainGroupLink}`;
        }

        await sock.sendMessage(playerJid, { text: payloadText });
        await new Promise(r => setTimeout(r, 600)); 
      }
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Smart Dispatch Complete:* All player updates sent successfully.` });
      activeMatchStaging = null;
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Dispatch Error: ${err.message}` });
    }
  },

  // 📝 Dynamic Preset Content Modification Module
  modify: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const modifierType = args[0]?.toLowerCase();
    const presetKey = args[1]?.toLowerCase()?.replace(/['"]+/g, '');
    if (!modifierType || !presetKey) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ `.modify preset \"key\" [text]`" });

    if (modifierType === 'preset') {
      const rawBody = args.slice(2).join(' ');
      if (!dynamicPresets[presetKey]) dynamicPresets[presetKey] = { imageUrl: "https://i.imgur.com/8K6Zg8b.png", caption: "" };
      dynamicPresets[presetKey].caption = rawBody;
      await sock.sendMessage(msg.key.remoteJid, { text: `🎯 Text preset definitions for [\"${presetKey}\"] updated.` });
    }
  },

  menu: async (sock, msg) => {
    const helpMenuText = `🏴‍☠️ *LUFFYTARO PIRATES SCRIMS BOT* 🏴‍☠️\n\n*🛡️ SECURITY:*\n* \`.addadmin [Number]\` - Add sub-admin\n* \`.deladmin [Number]\` - Remove sub-admin\n* \`.setmaingroup\` - Sets current room as your main hub\n\n*🏆 LOBBIES:*\n* \`.startresult [Event] [ID] [GroupLink]\` - Stage match details\n* \`.send\` - DM match updates + main hub link fallbacks`;
    await sock.sendMessage(msg.key.remoteJid, { text: helpMenuText });
  },

  handleHelpRequest: async (sock, msg, senderJid, userText) => {
    const cleanNum = senderJid.split('@')[0];
    const systemAdminNode = getActiveAdminForTime() || CONFIG.OWNER.split('@')[0];

    await sock.sendMessage(msg.key.remoteJid, { text: `🛠️ *SUPPORT TICKET OPENED*\n\nYour issue has been flagged. An admin will contact you right here shortly!` });
    await sock.sendMessage(`${systemAdminNode}@s.whatsapp.net`, { 
      text: `🚨 *URGENT: HELP REQUESTED*\n📱 *User:* wa.me/${cleanNum}\n📝 *Message:* "${userText}"` 
    });
  },

  handleGuidelineRequest: async (sock, msg) => {
    const cleanGuidelinesText = `🏴‍☠️ *PIRATES PAID SCRIMS | RULES*\n\n* ✨ *Fair Play:* Zero cheats allowed.\n* 🤝 *Respect:* No tracking links or spam.\n* ⏱️ *Timing:* Room coordinates drop early.\n\n🔥 *Lobbies clear payouts in 10 minutes flat!*`;
    await sock.sendMessage(msg.key.remoteJid, { text: cleanGuidelinesText });
  },

  // 🤖 AI Fallback Engine integration to handle custom queries
  handleAiFallback: async (sock, msg, incomingMessageText) => {
    const aiGeneratedResponse = await askGeminiAI(incomingMessageText);
    await sock.sendMessage(msg.key.remoteJid, { text: aiGeneratedResponse });
  }
};
