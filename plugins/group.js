import { registerCommand } from '../lib/plugins.js';
import { updateGroupSetting, getGroupSetting, addWarn, resetWarns } from '../lib/db.js';

// Helper function to extract a target JID from mentions, replies, or raw text arguments
function extractTargetJid(msg, args) {
    let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
    }
    if (!target && args[0]) {
        const cleanNum = args[0].replace(/[^0-9]/g, '');
        if (cleanNum.length >= 8) {
            target = `${cleanNum}@s.whatsapp.net`;
        }
    }
    return target;
}

// UPGRADED: Robust admin check that handles multi-device identifier strings seamlessly
async function checkBotAdminStatus(client, from) {
    try {
        const groupMetadata = await client.groupMetadata(from);
        
        // Extract the absolute clean phone number prefix of the bot
        const rawBotId = client.user.id || client.user.jid;
        const cleanBotNumber = rawBotId.split('@')[0].split(':')[0]; 
        const normalizedBotJid = `${cleanBotNumber}@s.whatsapp.net`;

        // Check if any admin entry's ID matches our normalized bot JID
        const botUser = groupMetadata.participants.find(p => {
            const cleanParticipantId = p.id.split('@')[0].split(':')[0] + '@s.whatsapp.net';
            return cleanParticipantId === normalizedBotJid;
        });

        return botUser?.admin === 'admin' || botUser?.admin === 'superadmin';
    } catch (err) {
        console.error('Admin status tracking exception:', err);
        return false;
    }
}

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
            txt += `▪️ @${mem.id.split('@')[0]}\n`;
            mentions.push(mem.id);
        }
        await client.sendMessage(from, { text: txt, mentions }, { quoted: msg });
    }
});

registerCommand({
    name: 'hidetag',
    category: 'group',
    description: 'Silent system wide ping notifications.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const meta = await client.groupMetadata(from);
        const txt = args.join(' ') || 'Attention required! 📢';
        await client.sendMessage(from, { text: txt, mentions: meta.participants.map(p => p.id) });
    }
});

registerCommand({
    name: 'add',
    category: 'group',
    description: 'Injects specified mobile credential targets into metadata arrays.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I cannot add users because I am not a *Group Admin*. Promote me first!' }, { quoted: msg });
        }

        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Please provide a clean phone number, tag a user, or reply to a message.' }, { quoted: msg });

        try {
            await client.groupParticipantsUpdate(from, [target], 'add');
            await client.sendMessage(from, { text: '✅ Profile target mapping request executed successfully.' }, { quoted: msg });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ Failed to add user. They may have privacy settings blocking group invites.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'kick',
    category: 'group',
    description: 'Expels target mappings.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;

        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ Action rejected. I must be a *Group Admin* to kick members.' }, { quoted: msg });
        }

        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Supply targeted member notation reference by tagging them or replying.' }, { quoted: msg });

        const rawBotId = client.user.id || client.user.jid;
        const cleanBotNumber = rawBotId.split('@')[0].split(':')[0]; 
        const botJid = `${cleanBotNumber}@s.whatsapp.net`;
        
        if (target === botJid) return await client.sendMessage(from, { text: '🤖 I cannot extract myself from this operational runtime.' }, { quoted: msg });

        try {
            await client.groupParticipantsUpdate(from, [target], 'remove');
            await client.sendMessage(from, { text: '✅ Target systematically extracted from group architecture.' }, { quoted: msg });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ Failed to execute removal routine.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'promote',
    category: 'group',
    description: 'Elevates permission status flags to administrator classes.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;

        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I require *Group Admin* privileges to promote participants.' }, { quoted: msg });
        }

        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or reply to a member to promote them.' }, { quoted: msg });

        try {
            await client.groupParticipantsUpdate(from, [target], 'promote');
            await client.sendMessage(from, { text: '✅ Level modifications finalized. Target promoted.' }, { quoted: msg });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ Promotion execution layer encountered an error.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'demote',
    category: 'group',
    description: 'Revokes elevated structural control tiers.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;

        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I require *Group Admin* privileges to demote participants.' }, { quoted: msg });
        }

        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or reply to an admin to demote them.' }, { quoted: msg });

        try {
            await client.groupParticipantsUpdate(from, [target], 'demote');
            await client.sendMessage(from, { text: '✅ Target stripped of administration authorization profiles.' }, { quoted: msg });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ Demotion execution layer encountered an error.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'mute',
    category: 'group',
    description: 'Configures broadcast modes allowing only management staff privileges.',
    execute: async ({ client, from, msg, isGroup }) => {
        if (!isGroup) return;
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I require *Group Admin* permissions to modify group settings.' }, { quoted: msg });
        }
        await client.groupSettingUpdate(from, 'announcement');
        await client.sendMessage(from, { text: '🔇 Group muted. Only admins can broadcast messages.' }, { quoted: msg });
    }
});

registerCommand({
    name: 'unmute',
    category: 'group',
    description: 'Restores generalized conversational privileges.',
    execute: async ({ client, from, msg, isGroup }) => {
        if (!isGroup) return;
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I require *Group Admin* permissions to modify group settings.' }, { quoted: msg });
        }
        await client.groupSettingUpdate(from, 'not_announcement');
        await client.sendMessage(from, { text: '🔊 Group unmuted. Everyone can send messages.' }, { quoted: msg });
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
        await client.sendMessage(from, { text: `👋 Welcome logging set to: *${val === 'true' ? 'ON' : 'OFF'}*` }, { quoted: msg });
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
        await client.sendMessage(from, { text: `🏃 Goodbye tracking status updated: *${val === 'true' ? 'ON' : 'OFF'}*` }, { quoted: msg });
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
        await client.sendMessage(from, { text: `🛡️ AntiLink system status set to: *${val === 'true' ? 'ON' : 'OFF'}*` }, { quoted: msg });
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
        await client.sendMessage(from, { text: `🗑️ AntiDelete intercept status modified to: *${val === 'true' ? 'ON' : 'OFF'}*` }, { quoted: msg });
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
        await client.sendMessage(from, { text: `⏳ AntiSpam configuration parameters saved as: *${val === 'true' ? 'ON' : 'OFF'}*` }, { quoted: msg });
    }
});

registerCommand({
    name: 'warn',
    category: 'group',
    description: 'Issues systemic violation flags.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;

        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or specify numerical identity target via reply or @mention.' }, { quoted: msg });

        const total = await addWarn(from, target);
        await client.sendMessage(from, { text: `⚠️ User @${target.split('@')[0]} has received an infraction flag. [Count: ${total}/3]`, mentions: [target] }, { quoted: msg });
        
        if (total >= 3) {
            if (!(await checkBotAdminStatus(client, from))) {
                return await client.sendMessage(from, { text: '❌ Limit hit! I cannot kick this user because I am not a *Group Admin*.' }, { quoted: msg });
            }
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
        
        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or reply to a valid user target to clear records.' }, { quoted: msg });
        
        await resetWarns(from, target);
        await client.sendMessage(from, { text: `✅ System infraction logs cleared for @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
    }
});
