import { registerCommand } from '../lib/Handler.js'; // ✅ Points to your real handler now
import { config } from '../config.js';
import { getSetting, setSetting } from '../lib/db.js';
import os from 'os';

registerCommand({
    name: 'menu',
    aliases: ['help'],
    category: 'basic',
    description: 'Displays the standard commands index interface.',
    execute: async ({ client, from, msg, startTime }) => {
        const uptimeMs = Date.now() - startTime;
        const uptime = new Date(uptimeMs).toISOString().substr(11, 8);
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
        const currentMode = await getSetting('mode') || config.mode;

        let menuText = `🏴‍☠️ *${config.botName}* 🏴‍☠️\n\n`;
        menuText += `👤 *Owner:* ${config.ownerName}\n`;
        menuText += `⚙️ *Version:* ${config.version}\n`;
        menuText += `⏳ *Runtime:* ${uptime}\n`;
        menuText += `📟 *RAM:* ${ram} MB / ${totalRam} GB\n`;
        menuText += `🔑 *Prefix:* \`${config.prefix}\`\n`;
        menuText += `🌐 *Mode:* ${currentMode.toUpperCase()}\n\n`;
        menuText += `--- *COMMAND LISTING* ---\n\n`;

        const categories = {};
        commands.forEach(cmd => {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            categories[cmd.category].push(cmd.name);
        });

        for (const [cat, cmds] of Object.entries(categories)) {
            menuText += `*🔹 [ ${cat.toUpperCase()} ]*\n`;
            menuText += `  └─ ${cmds.map(c => `\`${config.prefix}${c}\``).join(', ')}\n\n`;
        }

        menuText += `© LuffyTaro Bot`;
        await client.sendMessage(from, { text: menuText }, { quoted: msg });
    }
});

registerCommand({
    name: 'ping',
    category: 'basic',
    description: 'System operational speed check.',
    execute: async ({ client, from, msg }) => {
        const start = Date.now();
        const reaction = await client.sendMessage(from, { text: 'Evaluating system latency...' }, { quoted: msg });
        const latency = Date.now() - start;
        await client.sendMessage(from, { text: `🚀 Pong! \`${latency}ms\``, edit: reaction.key });
    }
});

registerCommand({
    name: 'alive',
    category: 'basic',
    description: 'Status verify.',
    execute: async ({ client, from, msg }) => {
        await client.sendMessage(from, { text: `🤖 *${config.botName}* is awake and listening! \nRun \`${config.prefix}menu\` for commands.` }, { quoted: msg });
    }
});

registerCommand({
    name: 'owner',
    category: 'basic',
    description: 'Displays builder coordinates.',
    execute: async ({ client, from, msg }) => {
        const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n'
            + `FN:${config.ownerName}\n`
            + `ORG:${config.botName} Central;\n`
            + `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:${config.ownerNumber}\n`
            + 'END:VCARD';
        await client.sendMessage(from, { contacts: { displayName: config.ownerName, contacts: [{ vcard }] } }, { quoted: msg });
    }
});

registerCommand({
    name: 'runtime',
    aliases: ['uptime'],
    category: 'basic',
    description: 'Check active engine duration metrics.',
    execute: async ({ client, from, msg, startTime }) => {
        const diff = Date.now() - startTime;
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        await client.sendMessage(from, { text: `⚡ System Runtime: \`${hours}h ${mins}m ${secs}s\`` }, { quoted: msg });
    }
});

registerCommand({
    name: 'system',
    category: 'basic',
    description: 'Core hardware load analysis telemetry.',
    execute: async ({ client, from, msg }) => {
        const text = `💻 *System Metrics:*\n- Platform: ${os.platform()} (${os.arch()})\n- CPU: ${os.cpus()[0].model}\n- Free RAM: ${(os.freemem() / 1024 / 1024).toFixed(2)} MB`;
        await client.sendMessage(from, { text }, { quoted: msg });
    }
});

registerCommand({
    name: 'restart',
    category: 'basic',
    description: 'Triggers system master daemon cycle reload.',
    execute: async ({ client, from, msg, isOwner }) => {
        if (!isOwner) return await client.sendMessage(from, { text: '❌ Owner configuration access required.' });
        await client.sendMessage(from, { text: '🔄 Reboot cycle acknowledged. Initiating process drop...' });
        process.send('reset');
        process.exit(0);
    }
});

registerCommand({
    name: 'shutdown',
    category: 'basic',
    description: 'Kills application context completely.',
    execute: async ({ client, from, msg, isOwner }) => {
        if (!isOwner) return await client.sendMessage(from, { text: '❌ Owner configuration access required.' });
        await client.sendMessage(from, { text: '🛑 Halting all threads. Shutting down completely...' });
        process.exit(0);
    }
});

registerCommand({
    name: 'mode',
    category: 'basic',
    description: 'Toggle application visibility mode.',
    execute: async ({ client, from, msg, args, isOwner }) => {
        if (!isOwner) return await client.sendMessage(from, { text: '❌ Owner confirmation needed.' });
        const target = args[0]?.toLowerCase();
        if (target !== 'public' && target !== 'private') {
            return await client.sendMessage(from, { text: `💡 Usage: \`${config.prefix}mode public\` or \`${config.prefix}mode private\`` });
        }
        await setSetting('mode', target);
        await client.sendMessage(from, { text: `⚙️ Core visibility mode switched to: *${target.toUpperCase()}*` });
    }
});
