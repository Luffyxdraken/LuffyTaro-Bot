import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import pino from 'pino';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    sessionDir: './sessions',
    authType: 'pairing', 
    ownerNumber: process.env.OWNER_NUMBER || '',
};

// 📂 AUTOMATIC PLUGINS LOADER ENGINE
const commands = new Map();
async function loadPlugins() {
    const pluginsDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginsDir)) return;

    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            // Dynamically import every file in your plugins directory
            await import(`./plugins/${file}`);
            console.log(chalk.green(`🔌 Loaded plugin: ${file}`));
        } catch (e) {
            console.error(chalk.red(`❌ Failed to load plugin ${file}:`), e);
        }
    }
}

// Global register function to catch plugins from your plugins folder
global.registerCommand = function(cmdObj) {
    commands.set(cmdObj.name, cmdObj);
};

async function startBot() {
    if (!fs.existsSync(config.sessionDir)) {
        fs.mkdirSync(config.sessionDir, { recursive: true });
    }

    // 🔐 SESSION LOAD: Base64 ENV
    if (process.env.SESSION_ID && !fs.existsSync(path.join(config.sessionDir, 'creds.json'))) {
        console.log(chalk.yellow('📦 SESSION_ID env se session bana raha hu...'));
        try {
            const sessionData = Buffer.from(process.env.SESSION_ID.trim(), 'base64').toString('utf-8');
            fs.writeFileSync(path.join(config.sessionDir, 'creds.json'), sessionData);
            console.log(chalk.green('✅ Session restore ho gaya'));
        } catch (e) {
            console.log(chalk.red('❌ SESSION_ID corrupt hai'));
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: config.authType === 'qr',
        browser: ['LuffyBot', 'Chrome', '20.0.04']
    });

    // Load plugins after client initiates
    await loadPlugins();

    // 🔑 PAIRING CODE
    const credsPath = path.join(config.sessionDir, 'creds.json');
    const hasCredsOnDisk = fs.existsSync(credsPath);
    const isRegistered = state.creds?.registered || hasCredsOnDisk;

    if (config.authType === 'pairing' && !isRegistered) {
        setTimeout(async () => {
            if (client.authState.creds.registered) return;
            const phoneNumber = process.env.BOT_NUMBER || config.ownerNumber;
            if (!phoneNumber) {
                console.log(chalk.red('❌ BOT_NUMBER env daalo 91xxxxxxxxxx format mein'));
                process.exit(1);
            }
            const code = await client.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            console.log(chalk.bold.yellow('\n🤖 PAIRING CODE: ' + code.match(/.{1,4}/g).join('-') + '\n'));
        }, 3000);
    } else {
        console.log(chalk.bold.green('💾 Session mila. Pairing skip.'));
    }

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red('Connection band:', lastDisconnect.error));
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(chalk.bold.green('✅ Bot connected! Your plugins are fully armed.'));
        }
    });

    // 🔔 GROUP PARTICIPANTS LISTENER (WELCOME/GOODBYE ENGINE)
    client.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            const dbPath = './lib/db.js';
            if (!fs.existsSync(dbPath)) return;
            
            const { getGroupSetting } = await import('./lib/db.js');
            const groupSettings = await getGroupSetting(id);
            const metadata = await client.groupMetadata(id);
            
            for (let num of participants) {
                const userTag = `@${num.split('@')[0]}`;
                if (action === 'add' && groupSettings?.welcome === 'true') {
                    const welcomeText = `👋 Welcome ${userTag} to *${metadata.subject}*!\n\n✨ Enjoy your stay and follow the rules.`;
                    await client.sendMessage(id, { text: welcomeText, mentions: [num] });
                }
                if (action === 'remove' && groupSettings?.goodbye === 'true') {
                    const goodbyeText = `🏃 Goodbye ${userTag}.\n\nYou will be missed! 🏴‍☠️`;
                    await client.sendMessage(id, { text: goodbyeText, mentions: [num] });
                }
            }
        } catch (err) {
            console.error('Error handling group entry/exit:', err);
        }
    });

    // 💬 CENTRAL COMMAND HANDLER LOOP
    client.ev.on('messages.upsert', async (msg) => {
        try {
            const mek = msg.messages[0];
            if (!mek.message || mek.key.fromMe) return;
            
            const messageType = Object.keys(mek.message)[0];
            const body = (messageType === 'conversation') ? mek.message.conversation : 
                         (messageType === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : 
                         (messageType === 'imageMessage') ? mek.message.imageMessage.caption : '';
            
            if (!body || !body.startsWith('.')) return;

            const args = body.slice(1).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const from = mek.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = isGroup ? mek.key.participant : from;

            // Route execution straight into your imported plugins folder files!
            const runCmd = commands.get(cmdName);
            if (runCmd) {
                await runCmd.execute({ 
                    client, 
                    from, 
                    msg: mek, 
                    isGroup, 
                    sender, 
                    args 
                });
            }
        } catch (err) {
            console.error('Error running plug-in script pipeline:', err);
        }
    });
}

startBot();
