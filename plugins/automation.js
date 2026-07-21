// ==========================================
// 🛡️ DYNAMIC GROUP WELCOME & GOODBYE ENGINE
// ==========================================

export async function handleGroupParticipants(sock, update) {
  const { id, participants, action } = update;
  
  if (!id.endsWith('@g.us')) return;

  // 📥 10 Short Welcome Variations - {user} dal diya
  const welcomeVariants = [
    `🏴‍☠️ *New warrior in the deck!* {user} Drop your lineup to secure a slot.`,
    `⚔️ *Challenger approaching!* Welcome {user} to Pirates Paid Scrims.`,
    `🎯 *A new squad leader has dropped in.* {user} Type \`.menu\` for rules.`,
    `🏴‍☠️ *Welcome to the crew!* {user} Ready to dominate the battlefield?`,
    `🎮 *Lobby update:* {user} has entered the matchmaking grid.`,
    `💥 *Clear the runway!* {user} just joined the queue.`,
    `🏆 *Welcome to Pirates Scrims!* {user} Get your team tags verified now.`,
    `🏴‍☠️ *The crew grows stronger.* {user} Don't miss tonight's map launch!`,
    `⚡ *New player detected.* {user} Lock your paid pass before slots close.`,
    `🔥 *A new warrior joins the lobby.* {user} Prepare your lineup!`
  ];

  // 📤 10 Short Goodbye Variations - {user} dal diya
  const goodbyeVariants = [
    `💀 *Man down!* {user} has been eliminated from the group.`,
    `🚪 *Squad member wiped!* {user} left. A slot has opened up.`,
    `🏴‍☠️ *{user} retreated into the storm.* Who's grabbing their slot?`,
    `❌ *Eliminated!* {user} left the tournament grounds.`,
    `💨 *{user} disconnected.* One less rival on the battlefield.`,
    `💀 *{user} wiped from the deck!* A squad spot went vacant.`,
    `🚪 *{user} has escaped.* Clear skies ahead for the rest!`,
    `⚠️ *Lobby alert:* {user} dropped out of the queue.`,
    `📉 *Crew size reduced.* {user} surrendered their position.`,
    `💀 *{user} eliminated from the roster!* Their journey ends here.`
  ];

  for (const participant of participants) {
    let messageText = "";
    const userTag = `@${participant.split('@')[0]}`; // 919876543210 format

    if (action === 'add') {
      const randomIndex = Math.floor(Math.random() * welcomeVariants.length);
      messageText = welcomeVariants[randomIndex].replace('{user}', userTag);
    } else if (action === 'remove') {
      const randomIndex = Math.floor(Math.random() * goodbyeVariants.length);
      messageText = goodbyeVariants[randomIndex].replace('{user}', userTag);
    }

    if (messageText) {
      try {
        await sock.sendMessage(id, { 
          text: messageText,
          mentions: [participant] // <-- YE LINE IMPORTANT HAI TAG KE LIYE
        });
      } catch (err) {
        console.error(`Automation layout failed to send to group ${id}:`, err.message);
      }
    }
  }
    }
