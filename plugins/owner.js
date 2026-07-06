import { registerCommand } from '../lib/Handler.js';
import { exec } from 'child_process';

registerCommand({
    name: 'eval',
    category: 'owner',
    description: 'Executes runtime JavaScript code context patterns directly inside memory tables.',
    execute: async ({ client, from, msg, args, isOwner, body, startTime }) => {
        if (!isOwner) return;
        const code = args.join(' ');
        if (!code) return await client.sendMessage(from, { text: '⚠️ Write dynamic statement blocks to interpret.' });
        
        try {
            let evaled = eval(code);
            if (typeof evaled !== 'string') evaled = import('util').then(u => u.inspect(evaled));
            await client.sendMessage(from, { text: `⚙️ *Runtime Evaluation Success:* \n\`\`\`javascript\n${await evaled}\n\`\`\`` });
        } catch (err) {
            await client.sendMessage(from, { text: `❌ *Runtime Evaluation Crash:* \n\`\`\`bash\n${err}\n\`\`\`` });
        }
    }
});

registerCommand({
    name: 'exec',
    category: 'owner',
    description: 'Executes raw shell command structures on localized hardware execution boards.',
    execute: async ({ client, from, msg, args, isOwner }) => {
        if (!isOwner) return;
        const cmd = args.join(' ');
        if (!cmd) return await client.sendMessage(from, { text: '⚠️ Write clear terminal instructions.' });
        
        exec(cmd, (err, stdout, stderr) => {
            if (err) return client.sendMessage(from, { text: `❌ *Shell Exception Execution Error:* \n\`\`\`bash\n${err}\n\`\`\`` });
            if (stderr) return client.sendMessage(from, { text: `⚠️ *Standard Error Track:* \n\`\`\`bash\n${stderr}\n\`\`\`` });
            client.sendMessage(from, { text: `💻 *Shell Console Output:* \n\`\`\`bash\n${stdout}\n\`\`\`` });
        });
    }
});

registerCommand({
    name: 'block',
    category: 'owner',
    description: 'Blocks target profiles.',
    execute: async ({ client, from, msg, args, isOwner }) => {
        if (!isOwner) return;
        const target = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await client.updateBlockStatus(target, 'block');
        await client.sendMessage(from, { text: `🚫 Profile route mapping identifier: @${target.split('@')[0]} blacklisted.`, mentions: [target] });
    }
});

registerCommand({
    name: 'unblock',
    category: 'owner',
    description: 'Restores standard communication route paths for blacklisted profiles.',
    execute: async ({ client, from, msg, args, isOwner }) => {
        if (!isOwner) return;
        const target = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await client.updateBlockStatus(target, 'unblock');
        await client.sendMessage(from, { text: `✅ Profile channel restrictions dropped for @${target.split('@')[0]}`, mentions: [target] });
    }
});

registerCommand({
    name: 'broadcast',
    category: 'owner',
    description: 'Transmits master data tracking broad notifications to chat rooms.',
    execute: async ({ client, from, msg, args, isOwner }) => {
        if (!isOwner) return;
        const text = args.join(' ');
        if (!text) return await client.sendMessage(from, { text: '⚠️ State dynamic message to broadcast.' });
        
        const chats = await client.groupFetchAllParticipating();
        const jids = Object.keys(chats);
        
        await client.sendMessage(from, { text: `📡 Disseminating message updates across \`${jids.length}\` chat rooms...` });
        for (let jid of jids) {
            await client.sendMessage(jid, { text: `📢 *Global System Broadcast Notification*\n\n${text}\n\n_Distributed from Owner Hub._` });
        }
    }
});

registerCommand({
    name: 'join',
    category: 'owner',
    description: 'Accepts invitation links and registers structural event profiles.',
    execute: async ({ client, from, msg, args, isOwner }) => {
        if (!isOwner) return;
        const link = args[0];
        if (!link) return await client.sendMessage(from, { text: '⚠️ Supply clear structural room handshake group codes.' });
        const code = link.split('chat.whatsapp.com/')[1];
        await client.groupAcceptInvite(code);
        await client.sendMessage(from, { text: '🚀 Group entry invitation resolved.' });
    }
});

registerCommand({
    name: 'leave',
    category: 'owner',
    description: 'Removes the tracking engine loop clean from active groups.',
    execute: async ({ client, from, msg, isGroup, isOwner }) => {
        if (!isOwner || !isGroup) return;
        await client.sendMessage(from, { text: '🏴‍☠️ Leaving group room structures as instructed...' });
        await client.groupLeave(from);
    }
});
