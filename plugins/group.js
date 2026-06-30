import { registerCommand } from '../lib/plugins.js';
import { updateGroupSetting, getGroupSetting, addWarn, resetWarns } from '../lib/db.js';

registerCommand({
    name: 'tagall',
    category: 'group',
    description: 'Tags every member inside the conversation room.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const meta = await client.groupMetadata(from);
        let txt = `📢 *Broadcast Announcement*\n\n📝 Msg: ${args.join(' ') || 'None'}\n\n`;
        const mentions = [];
        for (let mem of meta.participants) {
            txt += `@${mem.id.split('@')[0]}\n`;
            mentions.push(mem.id);
        }
        await client.sendMessage(from, { text: txt, mentions });
    }
});

registerCommand({
    name: 'hidetag',
    category: 'group',
    description: 'Silent system wide ping notifications.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const meta = await client.groupMetadata(from);
        const txt = args.join(' ') || 'Attention required!';
        await client.sendMessage(from, { text: txt, mentions: meta.participants.map(p => p.id) });
    }
});

registerCommand({
    name: 'add',
    category: 'group',
    description: 'Injects specified mobile credential targets into metadata arrays.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const num = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Supply clear subscriber numbers digits.' });
        await client.groupParticipantsUpdate(from, [num], 'add');
        await client.sendMessage(from, { text: '✅ Profile target mapping request executed.' });
    }
});

registerCommand({
    name: 'kick',
    category: 'group',
    description: 'Expels target mappings.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const num = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Supply targeted member notation reference.' });
        await client.groupParticipantsUpdate(from, [num], 'remove');
        await client.sendMessage(from, { text: '✅ Target systematically extracted.' });
    }
});

registerCommand({
    name: 'promote',
    category: 'group',
    description: 'Elevates permission status flags to administrator classes.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const num = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await client.groupParticipantsUpdate(from, [num], 'promote');
        await client.sendMessage(from, { text: '✅ Level modifications finalized.' });
    }
});

registerCommand({
    name: 'demote',
    category: 'group',
    description: 'Revokes elevated structural control tiers.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const num = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await client.groupParticipantsUpdate(from, [num], 'demote');
        await client.sendMessage(from, { text: '✅ Target stripped of administration authorization profiles.' });
    }
});

registerCommand({
    name: 'mute',
    category: 'group',
    description: 'Configures broadcast modes allowing only management staff privileges.',
    execute: async ({ client, from, msg, isGroup }) => {
        if (!isGroup) return;
        await client.groupSettingUpdate(from, 'announcement');
        await client.sendMessage(from, { text: '🔇 Group muted. Only admins can broadcast.' });
    }
});

registerCommand({
    name: 'unmute',
    category: 'group',
    description: 'Restores generalized conversational privileges.',
    execute: async ({ client, from, msg, isGroup }) => {
        if (!isGroup) return;
        await client.groupSettingUpdate(from, 'not_announcement');
        await client.sendMessage(from, { text: '🔊 Group unmuted. Everyone can send messages.' });
    }
});

registerCommand({
    name: 'welcome',
    category: 'group',
    description: 'Toggle custom entrance events alerts configuration switches.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const val = args[0]?.toLowerCase() === 'on' ? 'true' : 'false';
        await updateGroupSetting(from, 'welcome', val);
        await client.sendMessage(from, { text: `👋 Welcome logging set to: *${val === 'true' ? 'ON' : 'OFF'}*` });
    }
});

registerCommand({
    name: 'goodbye',
    category: 'group',
    description: 'Toggle custom exit events logs monitoring parameters.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const val = args[0]?.toLowerCase() === 'on' ? 'true' : 'false';
        await updateGroupSetting(from, 'goodbye', val);
        await client.sendMessage(from, { text: `🏃 Goodbye tracking status updated: *${val === 'true' ? 'ON' : 'OFF'}*` });
    }
});

registerCommand({
    name: 'antilink',
    category: 'group',
    description: 'Enforce structural automated security blocking actions for links.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const val = args[0]?.toLowerCase() === 'on' ? 'true' : 'false';
        await updateGroupSetting(from, 'antilink', val);
        await client.sendMessage(from, { text: `🛡️ AntiLink system status set to: *${val === 'true' ? 'ON' : 'OFF'}*` });
    }
});

registerCommand({
    name: 'antidelete',
    category: 'group',
    description: 'Toggle deletion avoidance cache engines.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const val = args[0]?.toLowerCase() === 'on' ? 'true' : 'false';
        await updateGroupSetting(from, 'antidelete', val);
        await client.sendMessage(from, { text: `🗑️ AntiDelete intercept status modified to: *${val === 'true' ? 'ON' : 'OFF'}*` });
    }
});

registerCommand({
    name: 'antispam',
    category: 'group',
    description: 'Configure high volume threat assessment mitigation protections.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const val = args[0]?.toLowerCase() === 'on' ? 'true' : 'false';
        await updateGroupSetting(from, 'antispam', val);
        await client.sendMessage(from, { text: `⏳ AntiSpam configuration parameters saved as: *${val === 'true' ? 'ON' : 'OFF'}*` });
    }
});

registerCommand({
    name: 'warn',
    category: 'group',
    description: 'Issues systemic violation flags.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const target = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Tag or specify numerical identity target.' });
        const total = await addWarn(from, target);
        await client.sendMessage(from, { text: `⚠️ User @${target.split('@')[0]} has received a infraction flag. [Count: ${total}/3]`, mentions: [target] });
        if (total >= 3) {
            await client.groupParticipantsUpdate(from, [target], 'remove');
            await resetWarns(from, target);
            await client.sendMessage(from, { text: `🚫 Execution cap reached. User dropped from runtime environment.` });
        }
    }
});

registerCommand({
    name: 'unwarn',
    category: 'group',
    description: 'Wipes compliance records clean.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const target = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Tag valid user coordinate mapping targets.' });
        await resetWarns(from, target);
        await client.sendMessage(from, { text: `✅ System infraction logs cleared for @${target.split('@')[0]}`, mentions: [target] });
    }
});
