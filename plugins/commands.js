import { getConfig } from '../sql/database.js';
import { CONFIG } from '../config.js';

let adminList = new Set(); 
let activeMatchStaging = null;
let mainGroupJid = null; 
let authorizedPosterGroups = new Set(); // Stores JIDs of groups getting the 15-min auto ads

let dynamicPresets = {
  pirates_paid_scrim: {
    imageUrl: "https://i.imgur.com/8K6Zg8b.png",
    caption: "🏴‍☠️ *PIRATES PAID SCRIMS* 🏴‍☠️\n\nWelcome to the supreme arena. Play hard, earn fast, claim victory cleanly."
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

export function getActiveMatch() { return activeMatchStaging; }
export function getAuthorizedPosterGroups() { return Array.from(authorizedPosterGroups); }

function verifyAuthority(senderJid, requireRoot = false) {
  const dynamicCleanNum = senderJid.split('@')[0];
  const rootCleanNum = CONFIG.OWNER.split('@')[0];
  if (dynamicCleanNum === rootCleanNum) return true;
  if (requireRoot) return false; 
  return adminList.has(dynamicCleanNum);
}

export const commands = {
  // 👑 Security Cluster
  addadmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) return;
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (targetAdmin) adminList.add(targetAdmin);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Clearance Granted:* Sub-admin +${targetAdmin} added.` });
  },

  deladmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) return;
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (targetAdmin && targetAdmin !== CONFIG.OWNER.split('@')[0]) adminList.delete(targetAdmin);
    await sock.sendMessage(msg.key.remoteJid, { text: `🗑 *Clearance Revoked:* Sub-admin removed.` });
  },

  listadmins: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    let text = `🏴‍☠️ *PIRATES ADMIN LIST*\n👑 Master: @${CONFIG.OWNER.split('@')[0]}\n`;
    adminList.forEach(admin => { text += `🛠 Sub: @${admin}\n`; });
    await sock.sendMessage(msg.key.remoteJid, { text, mentions: [CONFIG.OWNER, ...Array.from(adminList).map(n => `${n}@s.whatsapp.net`)] });
  },

  // 📍 Network Hub Anchor
  setmaingroup: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    if (!msg.key.remoteJid.endsWith('@g.us')) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Run this inside your main group!" });
    mainGroupJid = msg.key.remoteJid;
    await sock.sendMessage(msg.key.remoteJid, { text: "🏴‍☠️ *Anchor Locked:* This group is now set as the Main Hub." });
  },

  // 📢 New Dynamic Auto-Post Authorization Commands
  active: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    let targetGroupJid = "";
    
    // Check if link was provided, otherwise default to current room JID
    if (args[0]) {
      let inviteLink = args[0];
      if (inviteLink.includes('chat.whatsapp.com/')) {
        const code = inviteLink.split('chat.whatsapp.com/')[1].trim();
        try {
          const groupInfo = await sock.groupGetInviteInfo(code);
          targetGroupJid = groupInfo.id;
        } catch (e) {
          return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Invalid or expired group link code." });
        }
      } else if (inviteLink.endsWith('@g.us')) {
        targetGroupJid = inviteLink;
      }
    } else {
      if (msg.key.remoteJid.endsWith('@g.us')) {
        targetGroupJid = msg.key.remoteJid;
      } else {
        return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Please provide a group link or run this directly inside a group chat! \`.active [link]\`" });
      }
    }

    authorizedPosterGroups.add(targetGroupJid);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Auto-Post Active:* This bot will now broadcast the 15-minute shift text to group: \`${targetGroupJid}\`` });
  },

  deactive: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    let targetGroupJid = msg.key.remoteJid;
    if (args[0] && args[0].endsWith('@g.us')) targetGroupJid = args[0];

    if (authorizedPosterGroups.has(targetGroupJid)) {
      authorizedPosterGroups.delete(targetGroupJid);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Auto-Post Deactivated:* This group has been removed from the broadcast list." });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ This group was not on the active broadcast list." });
    }
  },

  // 🏁 Tournament Control
  startresult: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const eventName = args[0];
    const matchId = args[1];
    let groupLink = args[2];
    if (!eventName || !matchId || !groupLink) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ *Usage:* \`.startresult [Event_Name] [Match_ID] [Room_Group_Link]\`" });
    }

    if (groupLink.includes('chat.whatsapp.com/')) groupLink = groupLink.split('chat.whatsapp.com/')[1].trim();
    activeMatchStaging = { eventName, matchId, targetGroupMetadata: groupLink };
    await sock.sendMessage(msg.key.remoteJid, { text: `🏁 *Tournament Match Staged!*` });
  },

  // 📊 Multi-Channel Placements Dispatcher
  send: async (sock, msg, args, rawFullText) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    if (!activeMatchStaging) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ No active match staged. Run \`.startresult\` first." });
    if (!mainGroupJid) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Set your main community group using \`.setmaingroup\` first." });

    const lines = rawFullText.split('\n').slice(1);
    if (lines.length === 0) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Add your team lines right below the .send command!" });

    await sock.sendMessage(msg.key.remoteJid, { text: `📊 *Processing lists...*` });

    try {
      const mainMeta = await sock.groupMetadata(mainGroupJid);
      const mainInviteCode = await sock.groupInviteCode(mainGroupJid);
      const mainGroupLink = `https://chat.whatsapp.com/${mainInviteCode}`;

      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^(\d+):\s*(\d+)\s*(?:\((.*?)\))?/);
        if (!match) continue;

        const rank = parseInt(match[1]);
        const phone = match[2].trim();
        const teamName = match[3] ? match[3].trim() : "Unknown Team";
        const playerJid = `${phone}@s.whatsapp.net`;

        let payloadText = "";
        if (rank === 1) {
          payloadText = `🏆 *PIRATES SCRIMS CHAMPION (1st Place)* 🏆\n\nSensational victory Team *${teamName}*! You completely dominated *${activeMatchStaging.eventName}*.\n\n⚡ *Payout Processing:* Your cash prize clearance has been initialized and will hit your account within 10 minutes flat!`;
        } else if (rank === 2) {
          payloadText = `🥈 *PIRATES SCRIMS RUNNER UP (2nd Place)* 🥈\n\nIncredible gameplay Team *${teamName}*! You locked down 2nd place inside *${activeMatchStaging.eventName}*.\n\n⚡ Your placement rewards are being routed by our active shift manager now!`;
        } else if (rank === 3) {
          payloadText = `🥉 *PIRATES SCRIMS (3rd Place)* 🥉\n\nGreat fight Team *${teamName}*! You claimed 3rd place inside *${activeMatchStaging.eventName}*.\n\nKeep pushing, refine your rotations, and secure that top spot next match!`;
        } else {
          payloadText = `🏴‍☠️ *PIRATES SCRIMS PLACEMENT NOTIFICATION* ⚔️\n\nTeam *${teamName}* completed combat operations in position *#${rank}* for *${activeMatchStaging.eventName}*.\n\nReady up your squad, review the map guidelines, and clear the lobby next time!`;
        }

        const isPlayerInMainGroup = mainMeta.participants.some(p => p.id === playerJid);
        if (!isPlayerInMainGroup) {
          payloadText += `\n\n🔗 *Community Broadcast:* We noticed your team captain isn't in our main hub yet. Join up here to see live updates: ${mainGroupLink}`;
        }

        await sock.sendMessage(playerJid, { text: payloadText });
        await new Promise(r => setTimeout(r, 800)); 
      }
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Custom Leaderboard Dispatch Complete!*` });
      activeMatchStaging = null;
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${err.message}` });
    }
  },

  modify: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    const rawBody = args.slice(2).join(' ');
    if (dynamicPresets[args[1]]) dynamicPresets[args[1]].caption = rawBody;
    await sock.sendMessage(msg.key.remoteJid, { text: `🎯 Presets updated successfully.` });
  },

  menu: async (sock, msg) => {
    const menuDashboard = `🏴‍☠️ *LUFFYTARO PIRATES MASTER COMMAND DIRECTORY* 🏴‍☠️

👑 *SECURITY COMMANDS (Master Owner Only)*
• \`.addadmin [Phone]\` - Authorizes a new sub-admin number.
• \`.deladmin [Phone]\` - Instantly strips a sub-admin's clearance.

📍 *SYNC ANCHORS*
• \`.setmaingroup\` - Sets current room as main community hub.

📢 *BROADCAST LOOP CONTROL*
• \`.active [Group Link or ID]\` - Whitelists a group for the 15-minute background auto-poster.
• \`.deactive\` - Stops auto-posting inside the target group chat.

🏆 *SCRIMS AUTOMATION*
• \`.startresult [Name] [ID] [Link]\` - Stages an active match lobby.
• \`.send [Placements List]\` - Runs leaderboard DMs with main hub fallbacks.`;
    
    await sock.sendMessage(msg.key.remoteJid, { text: menuDashboard });
  },

  handleTournamentPitch: async (sock, msg) => {
    if (!activeMatchStaging) return;
    const currentOnDutyAdmin = getActiveAdminForTime() || CONFIG.OWNER.split('@')[0];
    let communityInviteLink = "https://chat.whatsapp.com/...";
    try {
      if (mainGroupJid) {
        const code = await sock.groupInviteCode(mainGroupJid);
        communityInviteLink = `https://chat.whatsapp.com/${code}`;
      }
    } catch (e) {}

    const pitchCaptionText = `🔥 *PIRATES TOURNAMENT IS LIVE NOW!* 🔥\n───────────────────────────\n🏆 *Active Event:* ${activeMatchStaging.eventName}\n🆔 *Match Register ID:* ${activeMatchStaging.matchId}\n\n🏴‍☠️ *HOW TO JOIN & REGISTER:*\n1️⃣ Join our Main Hub Group:\n👉 ${communityInviteLink}\n\n2️⃣ DM our active shift manager to lock slots:\n👉 wa.me/${currentOnDutyAdmin}`;

    await sock.sendMessage(msg.key.remoteJid, {
      image: { url: dynamicPresets.pirates_paid_scrim.imageUrl },
      caption: pitchCaptionText
    });
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
    await sock.sendMessage(msg.key.remoteJid, { text: dynamicPresets.pirates_paid_scrim.caption });
  },

  handleAiFallback: async (sock, msg, text) => {
    const fallbackText = `🏴‍☠️ *LuffyTaro Bot Engine* 🏴‍☠️\n\nAhoy! Thanks for messaging Pirates Scrims.\n\n• Type *guidelines* to read regulations.\n• Type *help* to contact admin staff.`;
    await sock.sendMessage(msg.key.remoteJid, { text: fallbackText });
  }
};
