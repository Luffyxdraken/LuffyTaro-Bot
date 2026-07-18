export async function handleGroupParticipants(sock, update) {
  const { id, participants, action } = update;

  for (const user of participants) {
    const jidNum = user.split('@')[0];

    // ⚡ AUTOMATIC WELCOME: Fires instantly when anyone joins
    if (action === 'add') {
      const text = `🏴‍☠️ @${jidNum} welcome to the pirate paid scrims! Make sure to read rules and grind hard!`;
      await sock.sendMessage(id, { text, mentions: [user] });
    } 
    
    // ⚡ AUTOMATIC GOODBYE: Fires instantly on kicks ('remove') or link leaves ('leave')
    else if (action === 'remove' || action === 'leave') {
      const text = `❌ @${jidNum} left the battlefield. Eliminated from scrims!`;
      await sock.sendMessage(id, { text, mentions: [user] });
    }
  }
}
