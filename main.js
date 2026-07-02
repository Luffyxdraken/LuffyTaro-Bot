import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import express from 'express';
import pino from 'pino';
import chalk from 'chalk';
import readline from 'readline';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { config } from './config.js';
import { initDatabase, getSetting } from './lib/db.js';
import { loadPlugins, commands } from './lib/plugins.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// HTTP Health checks & Keep-Alive binding
app.get('/', (req, res) => res.status(200).json({ status: 'online', bot: config.botName }));

const server = app.listen(config.port, () => {
    console.log(chalk.magenta(`🌐 Express monitor binding activated on port ${config.port}`));
});

// 🛡️ Prevent EADDRINUSE crash loop
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(chalk.yellow(`⚠️ Port ${config.port} is temporarily busy. Skipping web server rebinding, but starting WhatsApp core...`));
    } else {
        console.error(chalk.red('❌ Server error:'), err);
    }
});

export let client;
const startTime = Date.now();

async function startLuffyBot() {
    await initDatabase();
    await loadPlugins();
console.log(chalk.green(`✅ Total ${commands.size || commands.length} commands loaded`)); // 👈 ye line add kar

    if (!fs.existsSync(config.sessionDir)) {
        fs.mkdirSync(config.sessionDir, { recursive: true, mode: 0o777 });
    }

    // 🔐 AUTOMATED BASE64 SESSION DECODER
    if (process.env.SESSION_ID && !fs.existsSync(path.join(config.sessionDir, 'creds.json'))) {
        console.log(chalk.yellow('📦 SESSION_ID env se session bana raha hu...'));
        try {
            const sessionData = Buffer.from(process.env.SESSION_ID.trim(), 'base64').toString('utf-8');
            fs.writeFileSync(path.join(config.sessionDir, 'creds.json'), sessionData, { mode: 0o666 });
            console.log(chalk.green('✅ Session restore ho gaya'));
        } catch (e) {
            console.log(chalk.red('❌ SESSION_ID corrupt hai ya read nahi ho paa raha:'), e);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    client = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: config.authType === 'qr',
    auth: {
        const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);

client = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: config.authType === 'qr',
    auth: state, // 👈 seedha state daal de
    browser: ['Ubuntu', 'Chrome', '20.0.04']
});


    // Handle Pairing Setup Scenario
    if (config.authType === 'pairing' && !client.authState.creds.registered) {
        setTimeout(async () => {
            const phoneNumber = (process.env.BOT_NUMBER || config.ownerNumber).replace(/[^0-9]/g, '');
            if (!phoneNumber) {
                console.log(chalk.red('❌ BOT_NUMBER or OWNER_NUMBER must be populated for pairing connection!'));
                process.exit(1);
            }
            try {
                const code = await client.requestPairingCode(phoneNumber);
                console.log(chalk.bold.yellow('\n🤖 ---------------- LUFFYTARO PAIRING ENGINE ---------------- 🤖'));
                console.log(chalk.bold.white(`     Use the code below to pair your bot within WhatsApp App:`));
                console.log(chalk.bold.cyan(`\n                     👉   ${code}   👈\n`));
                console.log(chalk.bold.yellow('-------------------------------------------------------------\n'));
            } catch (err) {
                console.error(chalk.red('Failed to request pairing code: '), err);
            }
        }, 3000);
    }

    client.ev.on('creds.update', async () => {
        await saveCreds();
    });

    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && config.authType === 'qr') {
            console.log(chalk.yellow('📸 Scan the QR code displayed above to establish initialization.'));
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
                ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut 
                : true;
            
            console.log(chalk.red(`⚠️ Connection severed due to: ${lastDisconnect?.error}. Reconnecting context: ${shouldReconnect}`));
            
            if (shouldReconnect) {
                startLuffyBot();
            } else {
                console.log(chalk.bold.red('❌ Device Session permanently logged out. Clear local session path and restart.'));
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log(chalk.bold.green(`\n✅ ${config.botName} operational on multi-device handshake interface!`));
            console.log(chalk.cyan(`👑 Master: ${config.ownerName} [${config.ownerNumber}]`));
        }
    });

    client.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            if (msg.key && msg.key.remoteJid === 'status@broadcast') return;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            
            // Text Extraction Parsing Block
            let body = '';
            if (msg.message.conversation) body = msg.message.conversation;
            else if (msg.message.imageMessage?.caption) body = msg.message.imageMessage.caption;
            else if (msg.message.videoMessage?.caption) body = msg.message.videoMessage.caption;
            else if (msg.message.extendedTextMessage?.text) body = msg.message.extendedTextMessage.text;
            
            const sender = isGroup ? msg.key.participant : from;
            const isOwner = sender.replace(/[^0-9]/g, '') === config.ownerNumber.replace(/[^0-9]/g, '');
            const currentMode = await getSetting('mode') || 'public';
            
            if (currentMode === 'private' && !isOwner) return;

            if (config.autoRead) await client.readMessages([msg.key]);
            if (config.autoTyping) await client.sendPresenceUpdate('composing', from);
            if (config.autoRecording) await client.sendPresenceUpdate('recording', from);

            const isCmd = body.startsWith(config.prefix);
            if (!isCmd) return;

            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // 🔎 SECURE MOUNT CHECK: Supports array-based objects and plugin registries smoothly
            let matchedCmd;
            if (typeof commands.find === 'function') {
                matchedCmd = commands.find(cmd => cmd.name === commandName || (cmd.aliases && cmd.aliases.includes(commandName)));
            } else if (typeof commands.get === 'function') {
                matchedCmd = commands.get(commandName);
            }
            
            if (matchedCmd) {
                if (matchedCmd.category === 'owner' && !isOwner) {
                    return await client.sendMessage(from, { text: '❌ This access sequence is restricted exclusively to the Bot Overlord.' }, { quoted: msg });
                }
                
                const context = {
                    client,
                    msg,
                    from,
                    isGroup,
                    sender,
                    args,
                    isOwner,
                    body,
                    startTime
                };
                
                await matchedCmd.execute(context);
            }
        } catch (err) {
            console.error(chalk.red('Critical failure inside routing engine loop: '), err);
        }
    });
}

startLuffyBot();
