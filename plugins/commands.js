import { CONFIG } from '../config.js';

let adminList = new Set([
  "917866052212", 
  "919158210010", 
  "919954865200"    
]); 

let activeMatchStaging = null;
let mainGroupJid = CONFIG.MAIN_GROUP_JID || null; 
let authorizedPosterGroups = new Set(); 

// 📝 EDITABLE LOBBY CONFIGURATION ENGINE
export let LOBBY_TEMPLATE = {
  header: "🏴‍☠️ *10x PP LOBBY* 🏴‍☠️",
  clan: "*PIRATES™*",
  pricing: "> ENTRY - 30/50/100 RS\n> PP - 60 /100/180 RS",
  footer: "*_DM  +{ADMIN} FOR SLOTS_* 🔥"
};

// ==========================================================
// TIME-ROUTER (WITH FIRST, SECOND, THIRD NUMBERS UNLOCKED)
// ==========================================================
export function getActiveAdminForTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5)); 
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = (hours * 60) + minutes;

  // 1️⃣ First Number: 10:30 AM to 2:45 PM
  if (timeInMinutes >= (10 * 60 + 30) && timeInMinutes <= (14 * 60 + 45)) return "919158210010";
  // 2️⃣ Second Number: 3:30 PM to 8:45 PM
  if (timeInMinutes >= (15 * 60 + 30) && timeInMinutes <= (20 * 60 + 45)) return "919954865200";
  // 3️⃣ Third Number: 9:30 PM to 11:45 PM
  if (timeInMinutes >= (21 * 60 + 30) && timeInMinutes <= (23 * 60 + 45)) return "917866052212";
  return null;
}

export function getActiveMatch() { return activeMatchStaging; }
export function getAuthorizedPosterGroups() { return Array.from(authorizedPosterGroups); }

// Helper script to cleanly render the customized text broadcast layout
export function buildLobbyMessage() {
  const targetAdmin = getActiveAdminForTime() || "917866052212";
  const processedFooter = LOBBY_TEMPLATE.footer.replace("{ADMIN}", targetAdmin);
  return `${LOBBY_TEMPLATE.header}\n${LOBBY_TEMPLATE.clan}\n\n${LOBBY_TEMPLATE.pricing}\n\n${processedFooter}`;
}

// ==========================================================
// CRASH-PROOF VERIFY AUTHORITY
// ==========================================================
export function verifyAuthority(senderJid, requireRoot = false) {
  if (!senderJid) return false;
  
  const dynamicCleanNum = senderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  const rootCleanNum = CONFIG.OWNER ? CONFIG.OWNER.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : "917866052212";
  
  if (
    dynamicCleanNum === rootCleanNum || 
    dynamicCleanNum === "917866052212" || 
    dynamicCleanNum === "200747358617611" || 
    senderJid.includes("917866052212") ||
    senderJid.includes("200747358617611")
  ) {
    return true; 
  }
  
  if (requireRoot) return false;                     
  
  return adminList.has(dynamicCleanNum) || 
         adminList.has(dynamicCleanNum.slice(-10)) || 
         adminList.has("91" + dynamicCleanNum.slice(-10));             
}

// ==========================================================
// COMMAND REGISTRY
// ==========================================================
export const commands = {
  checktimer: async (sock, msg) => {
    const currentGroupId = msg.key.remoteJid;
    if (!currentGroupId.endsWith('@g.us')) {
      return await sock.sendMessage(currentGroupId, { text: "❌ *Error:* Please execute `.checktimer` directly within a WhatsApp group." });
    }

    const isActive = authorizedPosterGroups.has(currentGroupId);
    
    if (isActive) {
      const response = `⏱ *LuffyTaro Broadcast Status Check* ⏱\n───────────────────────────\n\n📢 *Transmission Status:* ONLINE\n🔄 *Loop interval:* Every 15 Minutes\n🎯 *Target JID:* \`${currentGroupId}\`\n\n✅ _The 15 minutes background timer loop is fully active in this group right now!_`;
      await sock.sendMessage(currentGroupId, { text: response });
    } else {
      const inactiveResponse = `⚠️ *LuffyTaro Broadcast Status Check* ⚠️\n───────────────────────────\n\n📢 *Transmission Status:* OFFLINE\n\n❌ _The background timer loop is not broadcast-mapping here yet. Type \`.active\` to engage the 15-minute scheduler in this room!_`;
      await sock.sendMessage(currentGroupId, { text: inactiveResponse });
    }
  },

  iamadmin: async (sock, msg) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    const coreNode = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    
    const successReply = `👑 *IDENTITY VERIFIED: ACCESS GRANTED* 👑\n───────────────────────────\n\n⚓ *Status:* Official Master Admin Authorized\n📱 *Detected JID:* \`${sender}\`\n🔢 *Parsed ID:* \`${coreNode}\`\n\n🦾 _LuffyTaro core engine fully recognizes your authority. Your commands (.menu, .testpost, .send, .checktimer) are completely unlocked._`;
    await sock.sendMessage(msg.key.remoteJid, { text: successReply });
  },

  testpost: async (sock, msg) => {
    const targetGroupIds = Array.from(authorizedPosterGroups);
    if (targetGroupIds.length === 0) {
      return await sock.sendMessage(msg.key.remoteJid, { 
        text: "⚠️ *Test Failed:* No auto-post groups are active right now. Run `.active` inside a group first!" 
      });
    }

    const testLobbyMessage = buildLobbyMessage();
    await sock.sendMessage(msg.key.remoteJid, { text: `🚀 Dispatching template test broadcast to ${targetGroupIds.length} groups...` });
    for (const groupId of targetGroupIds) {
      try { await sock.sendMessage(groupId, { text: testLobbyMessage }); } catch (err) {}
    }
  },

  // 📝 ADMIN CONFIGURATION TOOL FOR 15-MINUTE AUTOMATION TEXT LAYOUT
  setlobbytext: async (sock, msg, args, rawFullText) => {
    const usageStr = `⚠️ *Usage:* \`.setlobbytext [section] [New Text Content]\` \n\nValid sections are: \`header\`, \`clan\`, \`pricing\`, or \`footer\`. \n_(For footer, include {ADMIN} where the active number should be automatically inserted)_.`;
    
    if (args.length < 2) return await sock.sendMessage(msg.key.remoteJid, { text: usageStr });
    
    const targetSection = args[0].toLowerCase();
    const cleanContent = rawFullText.substring(rawFullText.indexOf(args[1])).trim();

    if (targetSection in LOBBY_TEMPLATE) {
      LOBBY_TEMPLATE[targetSection] = cleanContent;
      const confirmMsg = `✅ *Lobby Text Saved Successfully!*\n───────────────────────────\n\n🔎 *Preview of current live format generation:*\n\n${buildLobbyMessage()}`;
      await sock.sendMessage(msg.key.remoteJid, { text: confirmMsg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: usageStr });
    }
  },

  check: async (sock, msg) => {
    const currentHub = mainGroupJid || CONFIG.MAIN_GROUP_JID || "None Assigned";
    const broadcastTargets = Array.from(authorizedPosterGroups);
    
    let report = `📊 *LuffyTaro System Status Check*\n───────────────────────────\n\n🎯 *Main Community Hub:* \n\`${currentHub}\`\n📢 *Active Auto-Post Channels:* ${broadcastTargets.length}\n`;
    await sock.sendMessage(msg.key.remoteJid, { text: report });
  },

  addadmin: async (sock, msg, args) => {
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (!targetAdmin) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Usage: \`.addadmin 91XXXXXXXXXX\`" });
    adminList.add(targetAdmin);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Clearance Granted:* Sub-admin +${targetAdmin} added.` });
  },

  deladmin: async (sock, msg, args) => {
    const targetAdmin = args[0]?.replace(/[^0-9]/g, '');
    if (adminList.has(targetAdmin)) {
      adminList.delete(targetAdmin);
      await sock.sendMessage(msg.key.remoteJid, { text: `🗑️ *Clearance Revoked:* Sub-admin +${targetAdmin} removed.` });
    }
  },

  listadmins: async (sock, msg) => {
    const ownerClean = CONFIG.OWNER ? CONFIG.OWNER.split('@')[0] : '917866052212';
    let text = `🏴‍☠️ *PIRATES ADMIN LIST*\n\n👑 *Master Owner:* @${ownerClean}\n`;
    adminList.forEach(admin => { text += `🛠️ *Sub-Admin:* @${admin}\n`; });
    await sock.sendMessage(msg.key.remoteJid, { text, mentions: [CONFIG.OWNER || '917866052212@s.whatsapp.net'] });
  },

  setmaingroup: async (sock, msg) => {
    if (!msg.key.remoteJid.endsWith('@g.us')) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Run this inside your main group!" });
    mainGroupJid = msg.key.remoteJid;
    await sock.sendMessage(msg.key.remoteJid, { text: "🏴‍☠️ *Anchor Locked:* Main Hub saved." });
  },

  active: async (sock, msg, args) => {
    let targetGroupJid = "";
    if (args[0] && args[0].includes('chat.whatsapp.com/')) {
      let code = args[0].split('chat.whatsapp.com/')[1].trim().split('?')[0];
      try {
        const groupInfo = await sock.groupGetInviteInfo(code);
        targetGroupJid = groupInfo.id;
      } catch (e) {
        return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Invalid link code." });
      }
    } else {
      targetGroupJid = msg.key.remoteJid;
    }
    authorizedPosterGroups.add(targetGroupJid);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Auto-Post Active:* Target Registered for 15-minute background runs.` });
  },

  deactive: async (sock, msg) => {
    authorizedPosterGroups.delete(msg.key.remoteJid);
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Auto-Post Deactivated.*" });
  },

  startresult: async (sock, msg, args) => {
    const eventName = args[0];
    const matchId = args[1];
    if (!eventName || !matchId) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ *Usage:* \`.startresult [Event_Name] [Match_ID]\`" });
    }
    activeMatchStaging = { eventName, matchId };
    await sock.sendMessage(msg.key.remoteJid, { text: `🏁 *Tournament Match Staged:* Ready for leaderboard entries.` });
  },

  send: async (sock, msg, args, rawFullText) => {
    let lines = rawFullText.split('\n').slice(1);
    if (lines.length === 0 && args.length >= 2) {
      lines = [args.join(' ')];
    }
    
    if (lines.length === 0) {
      return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ *Usage:* \`.send [Phone_Number] [Rank/Description]\` or use line breaks." });
    }

    await sock.sendMessage(msg.key.remoteJid, { text: `📊 *Dispatching Custom Notification...*` });

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.trim().split(/ +/);
      const rawPhone = parts[0].replace(/[^0-9]/g, '');
      const description = parts.slice(1).join(' ');

      if (!rawPhone) continue;
      const playerJid = `${rawPhone}@s.whatsapp.net`;
      
      const currentEvent = activeMatchStaging?.eventName || "Pirates Scrims Tournament";
      const directAlert = `🏴‍☠️ *PIRATES SCRIMS OFFICIAL UPDATE* ⚔️\n\nTournament status delivery for your registered roster:\n\n✨ *Placement Result:* ${description || "Processed"}\n🏆 *Event Group:* ${currentEvent}\n\n⚡ _Rewards & rank indexing details are updating live via management channels._`;
      
      try {
        await sock.sendMessage(playerJid, { text: directAlert });
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error("Failed to send player message:", e.message);
      }
    }
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Leaderboard Notification Dispatched Successfully.*` });
  },

  menu: async (sock, msg) => {
    const isAuth = verifyAuthority(msg.key.participant || msg.key.remoteJid);
    if (isAuth) {
      await sock.sendMessage(msg.key.remoteJid, { text: `🏴‍☠️ *MASTER DIRECTORY*\n\n• \`.iamadmin\` - Check admin rights\n• \`.checktimer\` - Verify 15min clock state\n• \`.addadmin [Phone]\`\n• \`.active\` - Sync current group\n• \`.setlobbytext [section] [text]\` - Change 15m post text\n• \`.startresult [Name] [ID]\`\n• \`.send [Phone] [Results]\`\n• \`.testpost\` - Force test post` });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: `🏴‍☠️ *PLAYER SYSTEM*\n\nType *guidelines* to view regulations.\nType *help* to contact a live manager.` });
    }
  },

  // ✨ UNIQUE, STYLISH & CREATIVE CHAT CONVERSATION REPLIES
  handleAiFallback: async (sock, msg, userRawText) => {
    const cleanText = userRawText.toLowerCase().trim();
    let replyPayload = "";

    if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey')) {
      // Elegant Greeting Variations
      const greetings = [
        `🌊 *Welcome to the Pirates Scrims Horizon!* 🏴‍☠️\n\nA new challenger has stepped onto the deck. Ready to claim your glory today?\n\n💡 _Quick Actions:_ Type *guidelines* to check open room entry rules, or text *help* to call a shift moderator directly!`,
        `⚓ *Ahoy, Captain! LuffyTaro System Online.* \n\nThe battle arena is heating up. How can we optimize your squad parameters right now?\n\n⚡ Type *guidelines* for rules or *help* to ping active management lines.`,
        `⚔️ *Salutations, Warrior! Welcome to Pirates Scrims.* \n\nYou have entered the control station for the supreme esports arena. \n\n🎯 _Menu Guide:_ Reply *guidelines* to see lobby configuration models, or reply *help* to open a secure staff ticket!`
      ];
      // Pick a random style variation so it looks fresh and premium
      replyPayload = greetings[Math.floor(Math.random() * greetings.length)];
      
    } else if (cleanText.includes('price') || cleanText.includes('entry') || cleanText.includes('pay')) {
      replyPayload = `💰 *PIRATES TOURNAMENT RATES*\n───────────────────────────\n• Entry Fee: 30 / 50 / 100 RS\n• Prize Pool: 60 / 100 / 180 RS\n\nTo purchase custom lobby cards or reserve slots, type *help* to call an active manager!`;
    } else if (cleanText.includes('slot') || cleanText.includes('register') || cleanText.includes('join')) {
      replyPayload = `📝 *SLOT ALLOCATION REGISTRATION*\n\nOur matches deploy daily. To confirm registration slots for your squad, join our community circle right here:\n👉 ${CONFIG.MAIN_GROUP_INVITE_LINK || "Group Link"}`;
    } else {
      replyPayload = `🏴‍☠️ *LuffyTaro Automated Assistant*\n───────────────────────────\nI recognized your message: "_${userRawText}_"\n\n🤖 *Quick Action Shortcuts:*\n• Type *guidelines* - Read matchmaking rulebooks.\n• Type *help* - Query support personnel manually.\n\n🔗 *Official Hub Join Link:*\n👉 ${CONFIG.MAIN_GROUP_INVITE_LINK || "Group Link"}`;
    }

    await sock.sendMessage(msg.key.remoteJid, { text: replyPayload });
  }
};
                          
