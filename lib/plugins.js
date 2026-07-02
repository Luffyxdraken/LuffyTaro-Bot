export const commands = [];

export function registerCommand(cmdObj) {
    if (cmdObj && cmdObj.name) {
        commands.push(cmdObj);
    }
}

export async function loadPlugins() {
    console.log('📦 Manual commands register kar raha hu...');
    
    // Yahan tu apne commands likh de. Abhi test ke liye 2 de raha hu
    registerCommand({
        name: 'hi',
        aliases: ['hello'],
        execute: async ({ client, msg, from }) => {
            await client.sendMessage(from, { text: 'Hi bhai 👋 Bot online hai!' }, { quoted: msg });
        }
    });
    
    registerCommand({
        name: 'ping',
        execute: async ({ client, msg, from }) => {
            await client.sendMessage(from, { text: 'Pong 🏓' }, { quoted: msg });
        }
    });
    
    console.log(`✅ Total ${commands.length} commands loaded`);
}
