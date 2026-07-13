import { CONFIG } from '../config.js';

let adminList = new Set([
  "917866052212", 
  "919158210010", 
  "9954865200"    
]); 

let activeMatchStaging = null;
let mainGroupJid = CONFIG.MAIN_GROUP_JID || null; 
let authorizedPosterGroups = new Set(); 

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
  if (timeInMinutes >= (21 * 60 + 30) && timeInMinutes <= (23 * 60 + 45)) return "917866052212";
  return null;
}

export function getActiveMatch() { return activeMatchStaging; }
export function getAuthorizedPosterGroups() { return Array.from(authorizedPosterGroups); }

export function verifyAuthority(senderJid, requireRoot = false) {
  if (!senderJid) return false;
  const dynamicCleanNum = senderJid.split('@')[0].replace(/[^0-9]/g, '');
  const rootCleanNum = CONFIG.OWNER.split('@')[0].replace(/[^0-9]/g, '');
  
  if (dynamicCleanNum === rootCleanNum) return true; 
  if (requireRoot) return false;                     
  return adminList.has(dynamicCleanNum);             
}

export const commands = {
  // ⚡ ONE-TIME INSTANT LOOP TEST COMMAND
  testpost: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const targetGroupIds = Array.from(authorizedPosterGroups);
    if (targetGroupIds.length === 0) {
      return await sock.sendMessage(msg.key.remoteJid, { 
        text: "⚠️ *Test Failed:* No auto-post groups are active right now. Run `.active [Group Link]` first!" 
      });
    }

    const currentAdmin = getActiveAdminForTime() || CONFIG.OWNER.split('@')[0];
    const testLobbyMessage = `🏴‍☠️ *10x PP LOBBY [MANUAL TEST]* 🏴‍☠️\n*PIRATES™* 🇮🇳\n> 6 PM PAID CS LOBBY 📌\n\n> PIRATES CS LOBBY \n* *ENTRY - 30/50/100 RS*\n* *PP - 60 /100/180 RS*\n\n_*2v2 & 3v3 & 4v4 & 1v1 LIMITED AVAILABLE*_\n \n> PIRATES PAID SCRIMS\n\n\`BENEFIT\`\n*HIGHEST PP IN* \`COMMUNITY\`\n*PP CLEAR IN* \`10\` *MIN*\n\n*_DM  +${currentAdmin} FOR SLOTS_* 🔥`;

    await sock.sendMessage(msg.key.remoteJid, { text: `🚀 Dispatching 1-time test broadcast to ${targetGroupIds.length} groups...` });

    for (const groupId of targetGroupIds) {
      try {
        await sock.sendMessage(groupId, { text: testLobbyMessage });
      } catch (err) {
        console.error(err);
      }
    }
    await sock.sendMessage(msg.key.remoteJid, { text: "✅ *Test Broadcast Dispatched successfully.*" });
  },

  check: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const currentHub = mainGroupJid || CONFIG.MAIN_GROUP_JID || "None Assigned";
    const broadcastTargets = Array.from(authorizedPosterGroups);
    
    let report = `📊 *LuffyTaro System Status Check*\n───────────────────────────\n\n🎯 *Main Community Hub:* \n\`${currentHub}\`\n\n🔗 *Official Hub Link:* \n${CONFIG.MAIN_GROUP_INVITE_LINK}\n\n📢 *Active Auto-Post Channels:* ${broadcastTargets.length === 0 ? '_None registered._' : ''}\n`;
    
    broadcastTargets.forEach((id, i) => {
      report += `👉 Room [${i + 1}]: \`${id}\`\n`;
    });

    await sock.sendMessage(msg.key.remoteJid, { text: report });
  },

  addadmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) return;
    
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (!targetAdmin) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Usage: \`.addadmin 91XXXXXXXXXX\`" });
    
    adminList.add(targetAdmin);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Clearance Granted:* Sub-admin +${targetAdmin} added.` });
  },

  deladmin: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender, true)) return;
    
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (targetAdmin === CONFIG.OWNER.split('@')[0]) return;
    
    if (adminList.has(targetAdmin)) {
      adminList.delete(targetAdmin);
      await sock.sendMessage(msg.key.remoteJid, { text: `🗑️ *Clearance Revoked:* Sub-admin +${targetAdmin} removed.` });
    }
  },

  listadmins: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    let text = `🏴‍☠️ *PIRATES ADMIN LIST*\n\n👑 *Master Owner:* @${CONFIG.OWNER.split('@')[0]}\n`;
    adminList.forEach(admin => { text += `🛠️ *Sub-Admin:* @${admin}\n`; });
    await sock.sendMessage(msg.key.remoteJid, { text, mentions: [CONFIG.OWNER, ...Array.from(adminList).map(n => `${n}@s.whatsapp.net`)] });
  },

  setmaingroup: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    if (!msg.key.remoteJid.endsWith('@g.us')) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Run this inside your main group!" });
    mainGroupJid = msg.key.remoteJid;
    await sock.sendMessage(msg.key.remoteJid, { text: "🏴‍☠️ *Anchor Locked:* This group is now set as the Main Hub." });
  },

  active: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    let targetGroupJid = "";
    if (args[0]) {
      let inviteLink = args[0];
      if (inviteLink.includes('chat.whatsapp.com/')) {
        let code = inviteLink.split('chat.whatsapp.com/')[1].trim();
        if (code.includes('?')) code = code.split('?')[0];
        if (code.includes(']')) code = code.replace(']', '');
        
        try {
          const groupInfo = await sock.groupGetInviteInfo(code);
          targetGroupJid = groupInfo.id;
        } catch (e) {
          return await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Link Sync Error:* Invalid or expired group link code." });
        }
      } else if (inviteLink.endsWith('@g.us')) {
        targetGroupJid = inviteLink;
      }
    } else {
      if (msg.key.remoteJid.endsWith('@g.us')) {
        targetGroupJid = msg.key.remoteJid;
      } else {
        return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Please provide a group link or run this inside a group!" });
      }
    }

    authorizedPosterGroups.add(targetGroupJid);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Auto-Post Active:* Registered broadcast group target: \`${targetGroupJid}\`` });
  },

  deactive: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    let targetGroupJid = msg.key.remoteJid;
    if (args[0] && args[0].endsWith('@g.us')) targetGroupJid = args[0];

    if (authorizedPosterGroups.has(targetGroupJid)) {
      authorizedPosterGroups.delete(targetGroupJid);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Auto-Post Deactivated:* This group has been removed." });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ This group was not on the active list." });
    }
  },

  startresult: async (sock, msg, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;

    const eventName = args[0];
    const matchId = args[1];
    let groupLink = args[2] || CONFIG.MAIN_GROUP_INVITE_LINK;
    if (!eventName || !matchId) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ *Usage:* \`.startresult [Event_Name] [Match_ID]\`" });
    }

    if (groupLink.includes('chat.whatsapp.com/')) groupLink = groupLink.split('chat.whatsapp.com/')[1].trim();
    activeMatchStaging = { eventName, matchId, targetGroupMetadata: groupLink };
    await sock.sendMessage(msg.key.remoteJid, { text: `🏁 *Tournament Match Staged successfully using Official Link!*` });
  },

  send: async (sock, msg, args, rawFullText) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!verifyAuthority(sender)) return;
    if (!activeMatchStaging) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ No active match staged. Run \`.startresult\` first." });
    
    const communityLink = CONFIG.MAIN_GROUP_INVITE_LINK;
    const lines = rawFullText.split('\n').slice(1);
    if (lines.length === 0) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Add your team lines right below the .send command!" });

    await sock.sendMessage(msg.key.remoteJid, { text: `📊 *Processing lists...*` });

    try {
      let mainParticipants = [];
      const checkJid = mainGroupJid || CONFIG.MAIN_GROUP_JID;
      if (checkJid) {
        try {
          const mainMeta = await sock.groupMetadata(checkJid);
          mainParticipants = mainMeta.participants.map(p => p.id);
        } catch (e) {
          console.log("Could not pull current live metadata, defaulting safely.");
        }
      }

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

        const isPlayerInMainGroup = mainParticipants.includes(playerJid);
        if (!isPlayerInMainGroup) {
          payloadText += `\n\n🔗 *Community Broadcast:* We noticed your team captain isn't in our main hub yet. Join up here to see live updates: ${communityLink}`;
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
    const sender = msg.key.participant || msg.key.remoteJid;
    const currentOnDutyAdmin = getActiveAdminForTime() || CONFIG.OWNER.split('@')[0];
    
    if (verifyAuthority(sender)) {
      const masterDashboard = `🏴‍☠️ *LUFFYTARO PIRATES MASTER COMMAND DIRECTORY* 🏴‍☠️

👑 *SECURITY COMMANDS*
• \`.addadmin [Phone]\` - Authorizes a new sub-admin number.
• \`.deladmin [Phone]\` - Instantly strips a sub-admin's clearance.
• \`.listadmins\` - View all active admins.

📍 *SYNC ANCHORS*
• \`.setmaingroup\` - Sets current room as main community hub.
• \`.check\` - Diagnoses and prints current running configuration.

📢 *BROADCAST LOOP CONTROL*
• \`.active [Group Link]\` - Whitelists a group for the 15-minute background auto-poster.
• \`.testpost\` - Fires a 1-time manual post to verify loop transmission.
• \`.deactive\` - Stops auto-posting inside the target group chat.

🏆 *SCRIMS AUTOMATION*
• \`.startresult [Name] [ID]\` - Stages an active match lobby.
• \`.send [Placements List]\` - Runs leaderboard DMs with main hub fallbacks.`;
      
      await sock.sendMessage(msg.key.remoteJid, { text: masterDashboard });
    } else {
      const playerDashboard = `🏴‍☠️ *PIRATES SCRIMS PLAYER MENU* 🏴‍☠️
───────────────────────────
Need support or looking to register for open slots? Use the casual keyword options below directly in our private chat!

📝 *AVAILABLE PLAYER REQUESTS:*
• Type *guidelines* - Read tournament regulations and policies.
• Type *help* - Open an urgent support ticket directly with our administration team.

📞 *ACTIVE MANAGEMENT LINE:*
• Support Helpline: wa.me/${currentOnDutyAdmin}

_Official Main Hub Invite Link:_
👉 ${CONFIG.MAIN_GROUP_INVITE_LINK}`;
      
      await sock.sendMessage(msg.key.remoteJid, { text: playerDashboard });
    }
  },

  handleTournamentPitch: async (sock, msg) => {
    if (!activeMatchStaging) return;
    const currentOnDutyAdmin = getActiveAdminForTime() || CONFIG.OWNER.split('@')[0];

    const pitchDynamicText = `🔥 *PIRATES TOURNAMENT IS LIVE NOW!* 🔥\n───────────────────────────\n🏆 *Active Event:* ${activeMatchStaging.eventName}\n🆔 *Match Register ID:* ${activeMatchStaging.matchId}\n\n🏴‍☠️ *HOW TO JOIN & REGISTER:*\n1️⃣ Join our Main Hub Group:\n👉 ${CONFIG.MAIN_GROUP_INVITE_LINK}\n\n2️⃣ DM our active shift manager to lock slots:\n👉 wa.me/${currentOnDutyAdmin}`;

    await sock.sendMessage(msg.key.remoteJid, {
      image: { url: dynamicPresets.pirates_paid_scrim.imageUrl },
      caption: pitchDynamicText
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
    const fallbackText = `🏴‍☠️ *LuffyTaro Bot Engine* 🏴‍☠️\n\nAhoy! Thanks for messaging Pirates Scrims.\n\n• Type *guidelines* to read regulations.\n• Type *help* to contact admin staff.\n\nOfficial Link:\n👉 ${CONFIG.MAIN_GROUP_INVITE_LINK}`;
    await sock.sendMessage(msg.key.remoteJid, { text: fallbackText });
  }
};
