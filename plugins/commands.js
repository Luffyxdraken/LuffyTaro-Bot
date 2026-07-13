import { getConfig } from '../sql/database.js';
import { CONFIG } from '../config.js';

let adminList = new Set(); 
let activeMatchStaging = null;
let mainGroupJid = null; 

let dynamicPresets = {
  pirates_paid_scrim: {
    imageUrl: "https://i.imgur.com/8K6Zg8b.png",
    caption: "🏴‍☠️ *PIRATES PAID SCRIMS* 🏴‍☠️\n\nWelcome to the supreme arena."
  }
};

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

function verifyAuthority(senderJid, requireRoot = false) {
  const dynamicCleanNum = senderJid.split('@')[0];
  const rootCleanNum = CONFIG.OWNER.split('@')[0];
  if (dynamicCleanNum === rootCleanNum) return true;
  if (requireRoot) return false; 
  return adminList.has(dynamicCleanNum);
}

export const commands = {
  addadmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) return;
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (targetAdmin) adminList.add(targetAdmin);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Added sub-admin +${targetAdmin}` });
  },

  deladmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) return;
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (targetAdmin && targetAdmin !== CONFIG.OWNER.split('@')[0]) adminList.delete(targetAdmin);
    await sock.sendMessage(msg.key.remoteJid, { text: `🗑️ Removed sub-admin` });
  },

  setmaingroup: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    mainGroupJid = msg.key.remoteJid;
    await sock.sendMessage(msg.key.remoteJid, { text: "🏴‍☠️ *System Anchor Locked:* Main group saved." });
  },

  startresult: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const eventName = args[0];
    const matchId = args[1];
    let groupLink = args[2];
    if (!eventName || !matchId || !groupLink) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ `.startresult [Event] [MatchID] [GroupLink]`" });

    if (groupLink.includes('chat.whatsapp.com/')) groupLink = groupLink.split('chat.whatsapp.com/')[1].trim();
    activeMatchStaging = { eventName, matchId, targetGroupMetadata: groupLink };
    await sock.sendMessage(msg.key.remoteJid, { text: `🏁 *Match Staged:* [${eventName} | ${matchId}] linked successfully.` });
  },

  // 🔥 UPGRADED PARSER: Reads your text block list and matches placements perfectly!
  send: async (sock, msg, args, rawFullText) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    if (!activeMatchStaging) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Run `.startresult` first." });
    if (!mainGroupJid) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Use `.setmaingroup` in your main hub first." });

    // Extract the lines underneath the command text
    const lines = rawFullText.split('\n').slice(1); 
    if (lines.length === 0) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Please provide the team list lines below the `.send` command format!" });
    }

    await sock.sendMessage(msg.key.remoteJid, { text: `📊 *Parsing scores & dispatching individual player DMs...*` });

    try {
      const mainMeta = await sock.groupMetadata(mainGroupJid);
      const mainGroupInviteCode = await sock.groupInviteCode(mainGroupJid);
      const mainGroupLink = `https://chat.whatsapp.com/${mainGroupInviteCode}`;

      for (const line of lines) {
        if (!line.trim()) continue;

        // Parse format: "1: 919123456789 (Straw Hat)"
        const match = line.match(/^(\d+):\s*(\d+)\s*(?:\((.*?)\))?/);
        if (!match) continue;

        const rank = parseInt(match[1]);
        const phone = match[2].trim();
        const teamName = match[3] ? match[3].trim() : "Unknown Team";
        const playerJid = `${phone}@s.whatsapp.net`;

        let payloadText = "";

        // Customize the message template perfectly based on their placement position
        if (rank === 1) {
          payloadText = `🏆 *PIRATES SCRIMS CHAMPION (1st Place)* 🏆\n\nSensational work Team *${teamName}*! You completely dominated *${activeMatchStaging.eventName}*.\n\n⚡ *Payout Processing:* Your cash prize clearance has been initialized and will hit your account within 10 minutes flat!`;
        } else if (rank === 2) {
          payloadText = `🥈 *PIRATES SCRIMS RUNNER UP (2nd Place)* 🥈\n\nIncredible gameplay Team *${teamName}*! You locked down 2nd place inside *${activeMatchStaging.eventName}*.\n\n⚡ Your placement rewards are being routed by our active shift manager now!`;
        } else if (rank === 3) {
          payloadText = `🥉 *PIRATES SCRIMS (3rd Place)* 🥉\n\nGreat fight Team *${teamName}*! You claimed 3rd place inside *${activeMatchStaging.eventName}*.\n\nKeep pushing, refine your rotations, and secure that top spot next match!`;
        } else {
          payloadText = `🏴‍☠️ *PIRATES SCRIMS PLACEMENT NOTIFICATION* ⚔️\n\nTeam *${teamName}* completed combat operations in position *#${rank}* for *${activeMatchStaging.eventName}*.\n\nReady up your squad, review the map guidelines, and clear the lobby next time!`;
        }

        // Auto check if they are missing from your main hub community group
        const isPlayerInMainGroup = mainMeta.participants.some(p => p.id === playerJid);
        if (!isPlayerInMainGroup) {
          payloadText += `\n\n🔗 *Community Broadcast:* We noticed your team captain isn't in our main hub yet. Join up here to see live updates: ${mainGroupLink}`;
        }

        // Send direct 1-on-1 private message safely
        await sock.sendMessage(playerJid, { text: payloadText });
        await new Promise(r => setTimeout(r, 800)); // Anti-spam delay protection
      }

      await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Custom Leaderboard Dispatch Complete!* Every team captain has received their private ranking update.` });
      activeMatchStaging = null;
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Processing Interrupted: ${err.message}` });
    }
  },

  modify: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    const rawBody = args.slice(2).join(' ');
    if (dynamicPresets[args[1]]) dynamicPresets[args[1]].caption = rawBody;
    await sock.sendMessage(msg.key.remoteJid, { text: `🎯 Presets overwritten.` });
  },

  menu: async (sock, msg) => {
    const helpMenuText = `🏴‍☠️ *LUFFYTARO PIRATES SCRIMS BOT* 🏴‍☠️\n\n*🛡️ SECURITY:*\n* \`.addadmin [Number]\` - Add sub-admin\n* \`.deladmin [Number]\` - Remove sub-admin\n* \`.setmaingroup\` - Save current chat as Main Hub\n\n*🏆 LOBBIES:*\n* \`.startresult [Event] [ID] [GroupLink]\` - Stage match info\n* \`.send [List Below]\` - Send exact ranking text into DMs`;
    await sock.sendMessage(msg.key.remoteJid, { text: helpMenuText });
  }
};
