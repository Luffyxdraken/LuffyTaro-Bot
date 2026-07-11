import { getConfig } from '../sql/database.js';

export async function handleGroupParticipants(sock, update) {
  const { id, participants, action } = update;
  const config = getConfig(id);

  for (const user of participants) {
    const jidNum = user.split('@')[0];

    if (action === 'add') {
      if (config.welcome_type === '1') {
        const text = `🏴‍☠️ @${jidNum} welcome to the pirate paid scrims! Make sure to read rules and grind hard!`;
        await sock.sendMessage(id, { text, mentions: [user] });
      } else if (config.welcome_type === '2') {
        const text = `🌟 Welcome @${jidNum} to our second lineup backup chat! Stay active.`;
        await sock.sendMessage(id, { text, mentions: [user] });
      }
    } 
    
    else if (action === 'remove') {
      if (config.goodbye_type === '1') {
        const text = `❌ @${jidNum} left the battlefield. Eliminated from scrims!`;
        await sock.sendMessage(id, { text, mentions: [user] });
      } else if (config.goodbye_type === '2') {
        const text = `👋 Farewell @${jidNum}. Hope to see you in the next registration block!`;
        await sock.sendMessage(id, { text, mentions: [user] });
      }
    }
  }
}

