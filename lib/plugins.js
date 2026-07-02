import * as config from '../config.js';

export const commands = [];

export function registerCommand(cmdObj) {
    if (cmdObj && cmdObj.name) {
        commands.push(cmdObj);
    }
}

export async function loadPlugins() {
    commands.length = 0; // 👈 ye sabse upar
    console.log('📦 Manual commands register kar raha hu...');
    // baaki code
}
    
    // 1. HI Command
    registerCommand({
        name: 'hi',
        aliases: ['hello', 'hey'],
        execute: async ({ client, msg, from }) => {
            await client.sendMessage(from, { 
                text: 'Hi bhai 👋 Bot online hai aur active hai!' 
            }, { quoted: msg });
        }
    });
    
    // 2. PING Command with latency
    registerCommand({
        name: 'ping',
        aliases: ['pong'],
        execute: async ({ client, msg, from }) => {
            const start = Date.now();
            const sent = await client.sendMessage(from, { 
                text: '🏓 Pinging...' 
            }, { quoted: msg });
            const latency = Date.now() - start;
            await client.sendMessage(from, { 
                text: `🏓 Pong! Latency: ${latency}ms`, 
                edit: sent.key 
            });
        }
    });

    // 3. MENU Command - Bot active wala menu
    registerCommand({
        name: 'menu',
        aliases: ['help', 'commands', 'list'],
        execute: async ({ client, msg, from }) => {
            const menu = `🤖 *BOT MENU* 🤖

*Prefix:* ${config.prefix}
*Owner:* ${config.owner[0]}
*Status:* Online ✅

*Commands:*
${config.prefix}hi - Bot se hello bolo 👋
${config.prefix}ping - Latency check 🏓
${config.prefix}menu - Menu dekho 📋

Koi bhi command ${config.prefix} laga ke bhejo!
Bot active hai bhai 💯`;

            await client.sendMessage(from, { text: menu }, { quoted: msg });
        }
    });
    
    console.log(`✅ Total ${commands.length} commands loaded`);
}
