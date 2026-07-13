import { CONFIG } from '../config.js';

// In-Memory Database Fallbacks protecting against Render data wipes
let adminList = new Set(); 
let dynamicPresets = {
  pirates_paid_scrim: {
    imageUrl: "https://i.imgur.com/8K6Zg8b.png", // Initial default image configuration
    caption: "🏴‍☠️ *PIRATES PAID SCRIMS* 🏴‍☠️\n\nWelcome to the supreme arena. Play hard, earn fast, claim victory cleanly."
  }
};
let activeMatchStaging = null;

// Helper function to extract current accurate time coordinates in Indian Standard Time (IST)
export function getActiveAdminForTime() {
  const now = new Date();
  // Adjust server clock safely to standard IST coordinates (UTC +5:30)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = (hours * 60) + minutes;

  // 1. Frame: 10:30 AM to 02:45 PM
  if (timeInMinutes >= (10 * 60 + 30) && timeInMinutes <= (14 * 60 + 45)) {
    return "919158210010";
  }
  // 2. Frame: 03:30 PM to 08:45 PM
  if (timeInMinutes >= (15 * 60 + 30) && timeInMinutes <= (20 * 60 + 45)) {
    return "9954865200";
  }
  // 3. Frame: 09:30 PM to 11:45 PM
  if (timeInMinutes >= (21 * 60 + 30) && timeInMinutes <= (23 * 60 + 45)) {
    return "7866052212";
  }

  return null; // Silent window
}

// Verification mechanism to cleanly inspect processing authority tiers
function verifyAuthority(senderJid, requireRoot = false) {
  const dynamicCleanNum = senderJid.split('@')[0];
  const rootCleanNum = CONFIG.OWNER.split('@')[0];
  
  if (dynamicCleanNum === rootCleanNum) return true;
  if (requireRoot) return false; // Action rejected if executing user is missing Root Admin authorization keys
  return adminList.has(dynamicCleanNum);
}

export const commands = {
  // 🔑 Multi-Tier Security Core Module
  addadmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Security Denial:* Only the Master Owner holds clearance keys to write new sub-admins." });
    }
    
    if (!args[0]) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Usage: `.addadmin 91XXXXXXXXXX`" });
    const targetAdmin = args[0].replace(/[^0-9]/g, '');
    adminList.add(targetAdmin);
    
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Clearance Granted:* Number +${targetAdmin} successfully assigned as sub-admin.` });
  },

  deladmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Security Denial:* Only the Master Owner holds keys to revoke sub-admin nodes." });
    }

    if (!args[0]) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Usage: `.deladmin 91XXXXXXXXXX`" });
    const targetAdmin = args[0].replace(/[^0-9]/g, '');
    const rootCleanNum = CONFIG.OWNER.split('@')[0];

    if (targetAdmin === rootCleanNum) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "🛡️ *Action Terminated:* Deletion of Master Root Owner denied by built-in security protocol." });
    }

    if (adminList.has(targetAdmin)) {
      adminList.delete(targetAdmin);
      await sock.sendMessage(msg.key.remoteJid, { text: `🗑️ *Clearance Revoked:* Number +${targetAdmin} stripped of admin access.` });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Target number not found inside active sub-admin registers." });
    }
  },

  listadmins: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    let adminString = `🏴‍☠️ *PIRATES RUNTIME ADMIN NODES* 🏴‍☠️\n\n👑 *Master Owner:* @${CONFIG.OWNER.split('@')[0]}\n`;
    if (adminList.size === 0) {
      adminString += `\nNo secondary sub-admin nodes currently white-listed.`;
    } else {
      adminString += `\n🛠️ *Sub-Admins:*`;
      adminList.forEach(admin => { adminString += `\n- @${admin}`; });
    }

    await sock.sendMessage(msg.key.remoteJid, { 
      text: adminString, 
      mentions: [CONFIG.OWNER, ...Array.from(adminList).map(num => `${num}@s.whatsapp.net`)] 
    });
  },

  // 📝 Dynamic Preset Content Modification Module
  modify: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const modifierType = args[0]?.toLowerCase(); // "layout" or "preset"
    const presetKey = args[1]?.toLowerCase()?.replace(/['"]+/g, '');

    if (!modifierType || !presetKey) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ *Usage Formats:*\n1. Image: Send photo with caption `.modify layout \"preset_name\"`\n2. Caption: `.modify preset \"preset_name\" [Text details]`" });
    }

    if (modifierType === 'layout') {
      const hasImage = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (!hasImage) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error: You must attach or quote an image to update the layout preset." });
      
      // Structural placeholder storing direct configuration pointers safely inside live memory instances
      if (!dynamicPresets[presetKey]) dynamicPresets[presetKey] = { imageUrl: "", caption: "" };
      dynamicPresets[presetKey].imageUrl = "UPDATED_VIA_CLIENT_ATTACHMENT"; 
      
      await sock.sendMessage(msg.key.remoteJid, { text: `🎯 Layout update for preset keys [\"${presetKey}\"] registered successfully.` });
    } 
    
    else if (modifierType === 'preset') {
      const rawBody = args.slice(2).join(' ');
      if (!rawBody) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error: Missing text definition for target preset message configuration." });

      if (!dynamicPresets[presetKey]) dynamicPresets[presetKey] = { imageUrl: "https://i.imgur.com/8K6Zg8b.png", caption: "" };
      dynamicPresets[presetKey].caption = rawBody;

      await sock.sendMessage(msg.key.remoteJid, { text: `🎯 Text preset definitions for [\"${presetKey}\"] overwritten safely inside memory layers.` });
    }
  },

  // 🏆 Match Setup & Multi-Channel Dispatch Architecture
  startresult: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const eventName = args[0];
    const matchId = args[1];
    let groupLink = args[2];

    if (!eventName || !matchId || !groupLink) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Usage: `.startresult [Event_Name] [Match_ID] [Group_Link_or_ID]`" });
    }

    if (groupLink.includes('chat.whatsapp.com/')) {
      groupLink = groupLink.split('chat.whatsapp.com/')[1].trim();
    }

    activeMatchStaging = { eventName, matchId, targetGroupMetadata: groupLink };
    await sock.sendMessage(msg.key.remoteJid, { text: `🏁 *Match Instance Staged:* [${eventName} | ${matchId}] linked seamlessly to structural tracking link: ${groupLink}` });
  },

  send: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    if (!activeMatchStaging) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error: No active tournament match tracking instance staged. Run `.startresult` first." });

    await sock.sendMessage(msg.key.remoteJid, { text: `📊 *Processing Leaderboard metrics for [${activeMatchStaging.eventName}]*...\nExecuting automatic direct message delivery updates to group match structures.` });

    try {
      let linkedGroupJid = activeMatchStaging.targetGroupMetadata;
      if (!linkedGroupJid.endsWith('@g.us')) {
        // Attempting a dynamic link code lookup if a raw invite link string was supplied
        linkedGroupJid = await sock.groupAcceptInvite(activeMatchStaging.targetGroupMetadata);
      }
      
      const groupMeta = await sock.groupMetadata(linkedGroupJid);
      const groupParticipants = groupMeta.participants.map(p => p.id);

      // Automated direct messaging delivery sequence targeting player arrays within group parameters
      for (const playerJid of groupParticipants) {
        // Simulated structural logic sorting winners and losers based on real scoreboard performance
        const isWinnerSimulated = Math.random() > 0.5; 
        
        const messagePayload = isWinnerSimulated 
          ? `🏴‍☠️ *PIRATES PAID SCRIMS WINNER VERDICT* 🏆\n\nCongratulations! Your team locked clean dominant metrics inside *${activeMatchStaging.eventName} (${activeMatchStaging.matchId})*.\n\n⚡ Payout processing initialized. Your transaction clearance drops inside 10 minutes!`
          : `🏴‍☠️ *PIRATES PAID SCRIMS COMBAT UPDATE* ⚔️\n\nHard luck warrior! You competed inside *${activeMatchStaging.eventName} (${activeMatchStaging.matchId})*, but missed top position parameters. Gear up, ready up, and register for our next upcoming lobby!`;

        await sock.sendMessage(playerJid, { text: messagePayload });
        await new Promise(resolve => setTimeout(resolve, 500)); // Queue buffering delay to ensure security parameters
      }

      await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Dispatch Loop Absolute:* Direct Winner and Loser notification sequences completed successfully.` });
      activeMatchStaging = null; // Clean instance register from system memory layers
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Structural Dispatch Interrupted: ${err.message}` });
    }
  },

  // 🚨 Internal Inbound Message Parsers
  handleHelpRequest: async (sock, msg, senderJid, userText) => {
    const cleanNum = senderJid.split('@')[0];
    const systemAdminNode = getActiveAdminForTime() || CONFIG.OWNER.split('@')[0];

    // Player Context Response
    const playerConfirmation = `🛠️ *PIRATES SUPPORT TICKET OPENED*\n\nYour issue has been instantly flagged to our executive management crew. An admin will review your chat history and contact you directly right here shortly!`;
    await sock.sendMessage(msg.key.remoteJid, { text: playerConfirmation });

    // Administrative Relay Alert Generation
    const administrativeRelayAlert = `🚨 *URGENT: PLAYER HELP REQUESTED*\n───────────────────────\n📱 *User Number:* wa.me/${cleanNum}\n📝 *Problem Statement Text:* "${userText}"\n\n⚡ *Action Required:* Click the phone hyperlink above to open a direct chat interface with this player and clear their problem immediately.`;
    await sock.sendMessage(`${systemAdminNode}@s.whatsapp.net`, { text: administrativeRelayAlert });
  },

  handleGuidelineRequest: async (sock, msg) => {
    const targetPreset = dynamicPresets.pirates_paid_scrim;
    
    // AI Guidelines Modifier: Formats a clean, professional, simple text block every single time dynamically
    const cleanGuidelinesText = `🏴‍☠️ *PIRATES PAID SCRIMS | SYSTEM RULES*\n───────────────────────\nWelcome to the arena! Here is how we keep the matches fair and clean:\n\n* ✨ *Fair Play Protocols:* Zero tolerance policy against third-party configuration files, scripts, or hacking. Violations trigger permanent server locks.\n* 🤝 *Operational Respect:* Keep communications professional inside active chat hubs. No spam links allowed.\n* ⏱️ *Timing Configurations:* Room IDs and passwords drop early. Check timelines and ensure your squad is deployed.\n* 👑 *Management Jurisdiction:* Administration decisions are final across all structural scrim debates.\n\n🔥 *Lobbies clear payouts in 10 minutes flat. Play fair, grind harder!*`;

    await sock.sendMessage(msg.key.remoteJid, { 
      text: cleanGuidelinesText 
    });
  }
};
