// ==========================================
// 🛡️ DYNAMIC GROUP WELCOME & GOODBYE ENGINE
// ==========================================

export async function handleGroupParticipants(sock, update) {
  const { id, participants, action } = update;
  
  // Only target actual group chats
  if (!id.endsWith('@g.us')) return;

  // 📥 10 Short Welcome Variations (Joining)
  const welcomeVariants = [
    `🏴‍☠️ *New warrior in the deck!* Drop your lineup to secure a slot.`,
    `⚔️ *Challenger approaching!* Welcome to Pirates Paid Scrims.`,
    `🎯 *A new squad leader has dropped in.* Type \`.menu\` for rules.`,
    `🏴‍☠️ *Welcome to the crew!* Ready to dominate the battlefield?`,
    `🎮 *Lobby update:* A new contender has entered the matchmaking grid.`,
    `💥 *Clear the runway!* A fresh competitor just joined the queue.`,
    `🏆 *Welcome to Pirates Scrims!* Get your team tags verified now.`,
    `🏴‍☠️ *The crew grows stronger.* Don't miss tonight's map launch!`,
    `⚡ *New player detected.* Lock your paid pass entries before slots close.`,
    `🔥 *A new warrior joins the lobby.* Prepare your lineup!`
  ];

  // 📤 10 Short Goodbye Variations (Leaving/Eliminated)
  const goodbyeVariants = [
    `💀 *Man down!* A player has been eliminated from the group.`,
    `🚪 *Squad member wiped!* A clean slot has opened up in the lobby.`,
    `🏴‍☠️ *A player retreated into the storm.* Who's grabbing their slot?`,
    `❌ *Eliminated!* A contender has left the tournament grounds.`,
    `💨 *Player disconnected.* One less rival on the battlefield.`,
    `💀 *Wiped from the deck!* A squad spot just went vacant.`,
    `🚪 *An enemy player has escaped.* Clear skies ahead for the rest!`,
    `⚠️ *Lobby alert:* A player has dropped out of the matchmaking queue.`,
    `📉 *Crew size reduced.* A competitor has surrendered their position.`,
    `💀 *Eliminated from the roster!* Their journey ends here.`
  ];

  for (const participant of participants) {
    let messageText = "";

    if (action === 'add') {
      const randomIndex = Math.floor(Math.random() * welcomeVariants.length);
      messageText = welcomeVariants[randomIndex];
    } else if (action === 'remove') {
      const randomIndex = Math.floor(Math.random() * goodbyeVariants.length);
      messageText = goodbyeVariants[randomIndex];
    }

    // Dispatch message to the group chat if a valid action matched
    if (messageText) {
      try {
        await sock.sendMessage(id, { text: messageText });
      } catch (err) {
        console.error(`Automation layout failed to send to group ${id}:`, err.message);
      }
    }
  }
}
