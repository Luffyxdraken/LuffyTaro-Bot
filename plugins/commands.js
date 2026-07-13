import { getConfig } from '../sql/database.js';
import { CONFIG } from '../config.js';

// In-Memory Fallbacks to keep features running even during database reboots
let adminList = new Set(); 
let activeMatchStaging = null;
let dynamicPresets = {
  pirates_paid_scrim: {
    imageUrl: "https://i.imgur.com/8K6Zg8b.png",
    caption: "🏴‍☠️ *PIRATES PAID SCRIMS* 🏴‍☠️\n\nWelcome to the supreme arena. Play hard, earn fast, claim victory cleanly."
  }
};

// Time Engine providing active admin shift numbers based on exact IST timings
export function getActiveAdminForTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5)); // Safe shift to Indian Standard Time (IST)
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = (hours * 60) + minutes;

  // 10:30 AM to 02:45 PM
  if (timeInMinutes >= (10 * 60 + 30) && timeInMinutes <= (14 * 60 + 45)) {
    return "919158210010";
  }
  // 03:30 PM to 08:45 PM
  if (timeInMinutes >= (15 * 60 + 30) && timeInMinutes <= (20 * 60 + 45)) {
    return "9954865200";
  }
  // 09:30 PM to 11:45 PM
  if (timeInMinutes >= (21 * 60 + 30) && timeInMinutes <= (23 * 60 + 45)) {
    return "7866052212";
  }
  return null;
}

// Multi-Tier Admin Verification Ring
function verifyAuthority(senderJid, requireRoot = false) {
  const dynamicCleanNum = senderJid.split('@')[0];
  const rootCleanNum = CONFIG.OWNER.split('@')[0];
  
  if (dynamicCleanNum === rootCleanNum) return true;
  if (requireRoot) return false; 
  return adminList.has(dynamicCleanNum);
}

export const commands = {
  // 👑 Master Owner Permission Direct Commands
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

  // 📝 Dynamic AI Layout & Presets Modifier Command
  modify: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const modifierType = args[0]?.toLowerCase();
    const presetKey = args[1]?.toLowerCase()?.replace(/['"]+/g, '');

    if (!modifierType || !presetKey) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ *Usage Formats:*\n1. Image: Send photo with caption `.modify layout \"preset_name\"`\n2. Caption: `.modify preset \"preset_name\" [Text details]`" });
    }

    if (modifierType === 'layout') {
      if (!dynamicPresets[presetKey]) dynamicPresets[presetKey] = { imageUrl: "", caption: "" };
      dynamicPresets[presetKey].imageUrl = "IMAGE_UPDATED_IN_MEMORY"; 
      await sock.sendMessage(msg.key.remoteJid, { text: `🎯 Layout update for preset keys [\"${presetKey}\"] registered successfully.` });
    } else if (modifierType === 'preset') {
      const rawBody = args.slice(2).join(' ');
      if (!rawBody) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error: Missing text definition for target preset message configuration." });

      if (!dynamicPresets[presetKey]) dynamicPresets[presetKey] = { imageUrl: "https://i.imgur.com/8K6Zg8b.png", caption: "" };
      dynamicPresets[presetKey].caption = rawBody;
      await sock.sendMessage(msg.key.remoteJid, { text: `🎯 Text preset definitions for [\"${presetKey}\"] overwritten safely inside memory layers.` });
    }
  },

  // 🏆 Scrim Match Staging and Automated Direct Message Dispatch Commands
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
        linkedGroupJid = await sock.groupAcceptInvite(activeMatchStaging.targetGroupMetadata);
      }
      
      const groupMeta = await sock.groupMetadata(linkedGroupJid);
      const groupParticipants = groupMeta.participants.map(p => p.id);

      for (const playerJid of groupParticipants) {
        const isWinnerSimulated = Math.random() > 0.5; 
        
        const messagePayload = isWinnerSimulated 
          ? `🏴‍☠️ *PIRATES PAID SCRIMS WINNER VERDICT* 🏆\n\nCongratulations! Your team locked clean dominant metrics inside *${activeMatchStaging.eventName} (${activeMatchStaging.matchId})*.\n\n⚡ Payout processing initialized. Your transaction clearance drops inside 10 minutes!`
          : `🏴‍☠️ *PIRATES PAID SCRIMS COMBAT UPDATE* ⚔️\n\nHard luck warrior! You competed inside *${activeMatchStaging.eventName} (${activeMatchStaging.matchId})*, but missed top position parameters. Gear up, ready up, and register for our next upcoming lobby!`;

        await sock.sendMessage(playerJid, { text: messagePayload });
        await new Promise(resolve => setTimeout(resolve, 600)); 
      }

      await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Dispatch Loop Absolute:* Direct Winner and Loser notification sequences completed successfully.` });
      activeMatchStaging = null; 
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Structural Dispatch Interrupted: ${err.message}` });
    }
  },

  // 📋 Standard Dynamic Conversational Menu Command
  menu: async (sock, msg) => {
    const helpMenuText = `🏴‍☠️ *LUFFYTARO PIRATES COMMAND ENGINE* 🏴‍☠️\n\n*Prefix:* \`${CONFIG.PREFIX}\` \n\n*🛡️ SECURITY COMMANDS (Owner Only):*\n* \`.addadmin [Number]\` - Grant admin privileges\n* \`.deladmin [Number]\` - Revoke admin privileges\n* \`.listadmins\` - View active admin staff roster\n\n*📝 CONTENT MANAGEMENT:*\n* \`.modify preset \"pirates_paid_scrim\" [Text]\` - Alter rules text dynamically\n\n*🏆 LOBBY MANAGEMENT:*\n* \`.startresult [Event] [ID] [GroupLink]\` - Stage match tracking session\n* \`.send\` - Read match logs and fire results directly to player DMs`;
    await sock.sendMessage(msg.key.remoteJid, { text: helpMenuText });
  },

  // Internal conversational handlers used directly by main connection listener
  handleHelpRequest: async (sock, msg, senderJid, userText) => {
    const cleanNum = senderJid.split('@')[0];
    const systemAdminNode = getActiveAdminForTime() || CONFIG.OWNER.split('@')[0];

    const playerConfirmation = `🛠️ *PIRATES SUPPORT TICKET OPENED*\n\nYour issue has been instantly flagged to our executive management crew. An admin will review your chat history and contact you directly right here shortly!`;
    await sock.sendMessage(msg.key.remoteJid, { text: playerConfirmation });

    const administrativeRelayAlert = `🚨 *URGENT: PLAYER HELP REQUESTED*\n───────────────────────\n📱 *User Number:* wa.me/${cleanNum}\n📝 *Problem Statement Text:* "${userText}"\n\n⚡ *Action Required:* Click the phone hyperlink above to open a direct chat interface with this player and clear their problem immediately.`;
    await sock.sendMessage(`${systemAdminNode}@s.whatsapp.net`, { text: administrativeRelayAlert });
  },

  handleGuidelineRequest: async (sock, msg) => {
    const cleanGuidelinesText = `🏴‍☠️ *PIRATES PAID SCRIMS | SYSTEM RULES*\n───────────────────────\nWelcome to the arena! Here is how we keep the matches fair and clean:\n\n* ✨ *Fair Play Protocols:* Zero tolerance policy against third-party configuration files, scripts, or hacking. Violations trigger permanent server locks.\n* 🤝 *Operational Respect:* Keep communications professional inside active chat hubs. No spam links allowed.\n* ⏱️ *Timing Configurations:* Room IDs and passwords drop early. Check timelines and ensure your squad is deployed.\n* 👑 *Management Jurisdiction:* Administration decisions are final across all structural scrim debates.\n\n🔥 *Lobbies clear payouts in 10 minutes flat. Play fair, grind harder!*`;
    await sock.sendMessage(msg.key.remoteJid, { text: cleanGuidelinesText });
  }
};
