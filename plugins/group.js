import { registerCommand } from '../lib/Handler.js';
import { updateSetting, getSettings } from '../sql/database.js
import { jidDecode, delay } from '@whiskeysockets/baileys';

    
// Helper functions
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

function isNumeric(n) {
    return!isNaN(parseFloat(n)) && isFinite(n);
}

async function checkBotAdminStatus(client, from) {
    try {
        const groupMetadata = await client.groupMetadata(from);
        const botId = client.user.id;
        const botJid = jidDecode(botId)?.user + '@s.whatsapp.net';
        const botParticipant = groupMetadata.participants.find(p => p.id === botJid);
        return botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
    } catch (err) {
        return false;
    }
}

async function checkUserAdminStatus(client, from, userId) {
    try {
        const groupMetadata = await client.groupMetadata(from);
        const userParticipant = groupMetadata.participants.find(p => p.id === userId);
        return userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin';
    } catch (err) {
        return false;
    }
}

// -------------------------------------------------------------
// REGISTERED COMMAND MATRIX
// -------------------------------------------------------------

registerCommand({
    name: 'tagall',
    category: 'group',
    description: 'Tags every member inside the conversation room.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can use.tagall' }, { quoted: msg });
        }
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
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can use.hidetag' }, { quoted: msg });
        }
        const meta = await client.groupMetadata(from);
        const txt = args.join(' ') || 'Attention required! 📢';
        await client.sendMessage(from, { text: txt, mentions: meta.participants.map(p => p.id) });
    }
});

registerCommand({
    name: 'wapoll',
    category: 'group',
    description: 'Create WhatsApp poll',
    usage: '.wapoll Title,Option1,Option2,Option3',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return client.sendMessage(from, {text: '❌ Only admins'}, {quoted: msg});
        }
        const text = args.join(' ');
        if (!text.includes(',')) return client.sendMessage(from, {text: 'Usage:.wapoll Title,Opt1,Opt2'}, {quoted: msg});

        const [title,...options] = text.split(',');
        await client.sendMessage(from, {
            poll: {
                name: title.trim(),
                values: options.map(o => o.trim()),
                selectableCount: 1
            }
        }, {quoted: msg});
    }
});

registerCommand({
    name: 'add',
    category: 'group',
    description: 'Injects specified mobile credential targets into metadata arrays.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can add members' }, { quoted: msg });
        }
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I cannot add users because I am not a *Group Admin*. Promote me first!' }, { quoted: msg });
        }
        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Please provide a phone number, tag a user, or reply to a message.' }, { quoted: msg });
        try {
            await client.groupParticipantsUpdate(from, [target], 'add');
            await client.sendMessage(from, { text: '✅ Member added successfully.' }, { quoted: msg });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ Failed to add user. They may have privacy settings blocking group invites.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'requests',
    category: 'group',
    description: 'Approve or reject pending join requests',
    usage: '.requests approve all | reject all',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) return;

        const list = await client.groupRequestParticipantsList(from);
        if (!list.length) return client.sendMessage(from, {text: 'No pending requests'}, {quoted: msg});

        if (args[0] === 'approve' && args[1] === 'all') {
            for (let x of list) {
                await client.groupRequestParticipantsUpdate(from, [x.jid], 'approve');
                await delay(900);
            }
            return client.sendMessage(from, {text: `✅ Approved ${list.length}`}, {quoted: msg});
        }
        if (args[0] === 'reject' && args[1] === 'all') {
            for (let x of list) {
                await client.groupRequestParticipantsUpdate(from, [x.jid], 'reject');
                await delay(900);
            }
            return client.sendMessage(from, {text: `❌ Rejected ${list.length}`}, {quoted: msg});
        }

        let txt = '*Pending requests:*\n\n';
        list.forEach((x,i) => txt += `${i+1}. @${x.jid.split('@')[0]}\n`);
        client.sendMessage(from, {text: txt, mentions: list.map(x => x.jid)}, {quoted: msg});
    }
});

registerCommand({
    name: 'kick',
    category: 'group',
    description: 'Kick member. Supports.kick all and.kick 91',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can kick members' }, { quoted: msg });
        }
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I need admin to kick members' }, { quoted: msg });
        }

        const meta = await client.groupMetadata(from);

        //.kick all
        if (args[0] === 'all') {
            const users = meta.participants.filter(p =>!p.admin && p.id!== sender);
            await client.sendMessage(from, {text: `⚠️ Kicking ${users.length} members in 5s... Restart bot to stop`});
            await new Promise(r => setTimeout(r, 5000));
            for (let u of users) {
                await client.groupParticipantsUpdate(from, [u.id], 'remove');
                await delay(1000);
            }
            return;
        }

        //.kick 91 - kick numbers starting with 91
        if (args[0] && isNumeric(args[0])) {
            const users = meta.participants.filter(p =>!p.admin && p.id.split('@')[0].startsWith(args[0]));
            await client.sendMessage(from, {text: `⚠️ Kicking ${users.length} members starting with ${args[0]} in 5s...`});
            await new Promise(r => setTimeout(r, 5000));
            for (let u of users) {
                await client.groupParticipantsUpdate(from, [u.id], 'remove');
                await delay(1000);
            }
            return;
        }

        // Normal.kick @tag
        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or reply to a member' }, { quoted: msg });

        await client.groupParticipantsUpdate(from, [target], 'remove');
        await client.sendMessage(from, { text: `✅ Kicked @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
    }
});

registerCommand({
    name: 'invite',
    category: 'group',
    description: 'Get group invite link',
    execute: async ({ client, from, msg, isGroup, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) return;
        const code = await client.groupInviteCode(from);
        client.sendMessage(from, {text: `https://chat.whatsapp.com/${code}`}, {quoted: msg});
    }
});

registerCommand({
    name: 'revoke',
    category: 'group',
    description: 'Revoke group invite link',
    execute: async ({ client, from, msg, isGroup, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) return;
        await client.groupRevokeInvite(from);
        client.sendMessage(from, {text: '✅ Invite link revoked'}, {quoted: msg});
    }
});

registerCommand({
    name: 'promote',
    category: 'group',
    description: 'Elevates permission status flags to administrator classes.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can promote members' }, { quoted: msg });
        }
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I require *Group Admin* privileges to promote participants.' }, { quoted: msg });
        }
        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or reply to a member to promote them.' }, { quoted: msg });
        try {
            await client.groupParticipantsUpdate(from, [target], 'promote');
            await client.sendMessage(from, { text: `✅ @${target.split('@')[0]} is now an admin`, mentions: [target] }, { quoted: msg });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ Failed to promote member.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'demote',
    category: 'group',
    description: 'Revokes elevated structural control tiers.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can demote admins' }, { quoted: msg });
        }
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I require *Group Admin* privileges to demote participants.' }, { quoted: msg });
        }
        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or reply to an admin to demote them.' }, { quoted: msg });
        try {
            await client.groupParticipantsUpdate(from, [target], 'demote');
            await client.sendMessage(from, { text: `✅ @${target.split('@')[0]} is no longer an admin`, mentions: [target] }, { quoted: msg });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ Failed to demote member.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'mute',
    category: 'group',
    description: 'Configures broadcast modes allowing only management staff privileges.',
    execute: async ({ client, from, msg, isGroup, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can mute group' }, { quoted: msg });
        }
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ I require *Group Admin* permissions to modify group settings.' }, { quoted: msg });
        }
        await client.groupSettingUpdate(from, 'announcement');
        await client.sendMessage(from, { text: '🔇 Group muted. Only admins can send messages.' }, { quoted: msg });
    }
});

registerCommand({
    name: 'unmute',
    category: 'group',
    description: 'Restores generalized conversational privileges.',
    execute: async ({ client, from, msg, isGroup, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can unmute group' }, { quoted: msg });
        }
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
    description: 'Toggle welcome + set custom message..welcome on/off OR.welcome set Welcome to group!',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins' }, { quoted: msg });
        }

        if (args[0] === 'on') {
            await updateGroupSetting(from, 'welcome', 1);
            return await client.sendMessage(from, { text: '👋 Welcome messages: *ON*' }, { quoted: msg });
        }
        if (args[0] === 'off') {
            await updateGroupSetting(from, 'welcome', 0);
            return await client.sendMessage(from, { text: '👋 Welcome messages: *OFF*' }, { quoted: msg });
        }
        if (args[0] === 'set') {
            const customMsg = args.slice(1).join(' ');
            if (!customMsg) return client.sendMessage(from, {text: 'Usage:.welcome set Your message here. Use @user for mention'}, {quoted: msg});
            await updateGroupSetting(from, 'welcome_msg', customMsg);
            return client.sendMessage(from, {text: `✅ Custom welcome message saved:\n${customMsg}`}, {quoted: msg});
        }

        const status = await getGroupSetting(from, 'welcome');
        client.sendMessage(from, {text: `👋 Welcome: *${status===1? 'ON' : 'OFF'}*\nUsage:.welcome on/off/set message`}, {quoted: msg});
    }
});

registerCommand({
    name: 'goodbye',
    category: 'group',
    description: 'Toggle goodbye + set custom message..goodbye on/off OR.goodbye set Bye @user!',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins' }, { quoted: msg });
        }

        if (args[0] === 'on') {
            await updateGroupSetting(from, 'goodbye', 1);
            return await client.sendMessage(from, { text: '🏃 Goodbye messages: *ON*' }, { quoted: msg });
        }
        if (args[0] === 'off') {
            await updateGroupSetting(from, 'goodbye', 0);
            return await client.sendMessage(from, { text: '🏃 Goodbye messages: *OFF*' }, { quoted: msg });
        }
        if (args[0] === 'set') {
            const customMsg = args.slice(1).join(' ');
            if (!customMsg) return client.sendMessage(from, {text: 'Usage:.goodbye set Your message here. Use @user for mention'}, {quoted: msg});
            await updateGroupSetting(from, 'goodbye_msg', customMsg);
            return client.sendMessage(from, {text: `✅ Custom goodbye message saved:\n${customMsg}`}, {quoted: msg});
        }

        const status = await getGroupSetting(from, 'goodbye');
        client.sendMessage(from, {text: `🏃 Goodbye: *${status===1? 'ON' : 'OFF'}*\nUsage:.goodbye on/off/set message`}, {quoted: msg});
    }
});

registerCommand({
    name: 'antilink',
    category: 'group',
    description: 'Enforce structural automated security blocking actions for links.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can toggle antilink' }, { quoted: msg });
        }
        const val = args[0]?.toLowerCase() === 'on';
        await updateGroupSetting(from, 'antilink', val);
        await client.sendMessage(from, { text: `🛡️ AntiLink: *${val? 'ON' : 'OFF'}*` }, { quoted: msg });
    }
});

registerCommand({
    name: 'antidelete',
    category: 'group',
    description: 'Toggle deletion avoidance cache engines.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can toggle antidelete' }, { quoted: msg });
        }
        const val = args[0]?.toLowerCase() === 'on';
        await updateGroupSetting(from, 'antidelete', val);
        await client.sendMessage(from, { text: `🗑️ AntiDelete: *${val? 'ON' : 'OFF'}*` }, { quoted: msg });
    }
});

registerCommand({
    name: 'antispam',
    category: 'group',
    description: 'Configure high volume threat assessment mitigation protections.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can toggle antispam' }, { quoted: msg });
        }
        const val = args[0]?.toLowerCase() === 'on';
        await updateGroupSetting(from, 'antispam', val);
        await client.sendMessage(from, { text: `⏳ AntiSpam: *${val? 'ON' : 'OFF'}*` }, { quoted: msg });
    }
});

registerCommand({
    name: 'warn',
    category: 'group',
    description: 'Issues systemic violation flags.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can warn members' }, { quoted: msg });
        }
        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or reply to a user to warn them.' }, { quoted: msg });
        const total = await addWarn(from, target);
        await client.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} warned. [${total}/3]`, mentions: [target] }, { quoted: msg });
        if (total >= 3) {
            if (!(await checkBotAdminStatus(client, from))) {
                return await client.sendMessage(from, { text: '❌ 3 warns reached! I cannot kick because I am not a *Group Admin*.' }, { quoted: msg });
            }
            await client.groupParticipantsUpdate(from, [target], 'remove');
            await resetWarns(from, target);
            await client.sendMessage(from, { text: `🚫 @${target.split('@')[0]} kicked after 3 warnings.`, mentions: [target] });
        }
    }
});

registerCommand({
    name: 'unwarn',
    category: 'group',
    description: 'Wipes compliance records clean.',
    execute: async ({ client, from, msg, isGroup, args, sender }) => {
        if (!isGroup) return;
        if (!(await checkUserAdminStatus(client, from, sender))) {
            return await client.sendMessage(from, { text: '❌ Only group admins can unwarn members' }, { quoted: msg });
        }
        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ Tag or reply to a user to clear warns.' }, { quoted: msg });
        await resetWarns(from, target);
        await client.sendMessage(from, { text: `✅ Warns cleared for @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
    }
});
