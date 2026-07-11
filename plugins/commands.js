import { updateConfig, getConfig } from '../sql/database.js';
import { CONFIG } from '../config.js';

export const commands = {
  menu: async (sock, msg) => {
    const menuText = `🏴‍☠️ *LuffyTaro Welcome Bot Menu* 🏴‍☠️\n\n` +
      `*Commands Available:*\n` +
      `• \`${CONFIG.PREFIX}welcome on\` - Set Welcome Message 1\n` +
      `• \`${CONFIG.PREFIX}welcome 2\` - Set Welcome Message 2\n` +
      `• \`${CONFIG.PREFIX}welcome off\` - Disable Welcome\n\n` +
      `• \`${CONFIG.PREFIX}goodbye on\` - Set Goodbye Message 1\n` +
      `• \`${CONFIG.PREFIX}goodbye 2\` - Set Goodbye Message 2\n` +
      `• \`${CONFIG.PREFIX}goodbye off\` - Disable Goodbye\n\n` +
      `• \`${CONFIG.PREFIX}owner\` - Display details of the Scrims Creator\n` +
      `• \`${CONFIG.PREFIX}status\` - Check current group event configuration`;
    
    await sock.sendMessage(msg.key.remoteJid, { text: menuText });
  },

  welcome: async (sock, msg, args) => {
    if (!msg.key.remoteJid.endsWith('@g.us')) return;
    const type = args[0];
    
    if (type === 'on') {
      updateConfig(msg.key.remoteJid, 'welcome_type', '1');
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Welcome Variant 1 Activated!* (@user welcome to the pirate paid scrims)' });
    } else if (type === '2') {
      updateConfig(msg.key.remoteJid, 'welcome_type', '2');
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Welcome Variant 2 Activated!*' });
    } else if (type === 'off') {
      updateConfig(msg.key.remoteJid, 'welcome_type', 'off');
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Welcome notifications have been disabled.*' });
    }
  },

  goodbye: async (sock, msg, args) => {
    if (!msg.key.remoteJid.endsWith('@g.us')) return;
    const type = args[0];

    if (type === 'on') {
      updateConfig(msg.key.remoteJid, 'goodbye_type', '1');
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Goodbye Variant 1 Activated!*' });
    } else if (type === '2') {
      updateConfig(msg.key.remoteJid, 'goodbye_type', '2');
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Goodbye Variant 2 Activated!*' });
    } else if (type === 'off') {
      updateConfig(msg.key.remoteJid, 'goodbye_type', 'off');
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ *Goodbye notifications have been disabled.*' });
    }
  },

  owner: async (sock, msg) => {
    const ownerNum = CONFIG.OWNER.split('@')[0];
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Luffy Scrims Owner\nTEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}\nEND:VCARD`;
    await sock.sendMessage(msg.key.remoteJid, { contacts: { displayName: 'Luffy Scrims Owner', contacts: [{ vcard }] } });
  },

  status: async (sock, msg) => {
    if (!msg.key.remoteJid.endsWith('@g.us')) return;
    const current = getConfig(msg.key.remoteJid);
    await sock.sendMessage(msg.key.remoteJid, { text: `📊 *Current Group Settings:*\n• Welcome Mode: \`${current.welcome_type}\`\n• Goodbye Mode: \`${current.goodbye_type}\`` });
  }
};
