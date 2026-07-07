ppimport { registerCommand } from '../lib/Handler.js';
import { updateGroupSetting, getGroupSetting } from '../lib/db.js';
import { jidDecode } from '@whiskeysockets/baileys';

// Helper function to extract a target JID safely
function extractTargetJid(msg, args) {
    let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
    }
    if (!target && args[0]) {
        const cleanNum = args[0].replace(/[^0-9]/g, '');
        if (cleanNum.length >= 8) target = `${cleanNum}@s.whatsapp.net`;
    }
    return target;
}

// Robust admin validation checker
async function checkBotAdminStatus(client, from) {
    try {
        const groupMetadata = await client.groupMetadata(from);
        const rawBotId = client.user.id || client.user.jid || '';
        const decodedBot = jidDecode(rawBotId);
        const botUserNumber = decodedBot ? decodedBot.user : rawBotId.split(':')[0].split('@')[0];

        const botUser = groupMetadata.participants.find(p => {
            const decodedParticipant = jidDecode(p.id);
            return (decodedParticipant ? decodedParticipant.user : p.id.split(':')[0].split('@')[0]) === botUserNumber;
        });
        return botUser?.admin === 'admin' || botUser?.admin === 'superadmin';
    } catch { return false; }
}

// --- WELCOME & GOODBYE TOGGLES ---
registerCommand({
    name: 'welcome',
    category: 'config',
    description: 'Toggle entrance greeting system.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const val = args[0]?.toLowerCase() === 'on' ? 'true' : 'false';
        await updateGroupSetting(from, 'welcome', val);
        await client.sendMessage(from, { text: `⚙️ **[SYSTEM]** Welcome logs configured to: **${val === 'true' ? 'ENABLED' : 'DISABLED'}**` }, { quoted: msg });
    }
});

registerCommand({
    name: 'goodbye',
    category: 'config',
    description: 'Toggle departure logs.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        const val = args[0]?.toLowerCase() === 'on' ? 'true' : 'false';
        await updateGroupSetting(from, 'goodbye', val);
        await client.sendMessage(from, { text: `⚙️ **[SYSTEM]** Goodbye tracking configured to: **${val === 'true' ? 'ENABLED' : 'DISABLED'}**` }, { quoted: msg });
    }
});

// --- DISCORD RANK SYSTEM (PROMOTE / DEMOTE) ---
registerCommand({
    name: 'promote',
    aliases: ['giverole', 'rank'],
    category: 'admin',
    description: 'Elevates a user to Administrator ranks.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ **Error:** I require Administrator permissions to adjust roles.' }, { quoted: msg });
        }

        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ **Usage:** Tag a user or reply to give them the Admin rank.' }, { quoted: msg });

        try {
            await client.groupParticipantsUpdate(from, [target], 'promote');
            await client.sendMessage(from, {
    text: `**RANK UP** \n\n USER: @${target.split('@')[0]}\n ROLE: **Grand Admiral**`,
    mentions: [target]
}, { quoted: msg });

```
Try pasting this in and see if it works for you.

            }, { quoted: msg });
        } catch {
            await client.sendMessage(from, { text: '❌ **System Error:** Failed to modify authorization properties.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'demote',
    aliases: ['removerole'],
    category: 'admin',
    description: 'Strips administrator authority flags.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        if (!(await checkBotAdminStatus(client, from))) {
            return await client.sendMessage(from, { text: '❌ **Error:** Admin validation check failed.' }, { quoted: msg });
        }

        const target = extractTargetJid(msg, args);
        if (!target) return await client.sendMessage(from, { text: '⚠️ **Usage:** Tag a user to revoke their Admin status.' }, { quoted: msg });

        try {
            await client.groupParticipantsUpdate(from, [target], 'demote');
            await client.sendMessage(from, {
    text: `**RANK UP** \n\n USER: @${target.split('@')[0]}\n ROLE: **Grand Admiral**`,
    mentions: [target]
}, { quoted: msg });
            
        } catch {
            await client.sendMessage(from, { text: '❌ **System Error:** Request rejected by server layers.' }, { quoted: msg });
        }
    }
});

// --- NATIVE DISCORD-STYLE POLL ENGINE ---
registerCommand({
    name: 'poll',
    category: 'utility',
    description: 'Creates an interactive community vote poll.',
    execute: async ({ client, from, msg, isGroup, args }) => {
        if (!isGroup) return;
        
        const input = args.join(' ');
        if (!input.includes('|')) {
            return await client.sendMessage(from, { text: '⚠️ **Format:** `.poll Question | Option 1 | Option 2`' }, { quoted: msg });
        }

        const parts = input.split('|').map(p => p.trim());
        const question = parts[0];
        const options = parts.slice(1);

        if (options.length < 2) return await client.sendMessage(from, { text: '❌ **Error:** Please provide at least two voting parameters.' }, { quoted: msg });
        if (options.length > 5) return await client.sendMessage(from, { text: '❌ **Error:** Multi-option max limit is capped at 5 lines.' }, { quoted: msg });

        await client.sendMessage(from, {
            poll: {
                name: `📊 **COMMUNITY VOTE**\n\n${question}`,
                values: options,
                selectableCount: 1
            }
        });
    }
});
