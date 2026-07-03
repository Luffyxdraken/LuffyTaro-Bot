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

// 🛡️ Safe guard to prevent port collision crashes
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(chalk.yellow(`⚠️ Port ${config.port} is busy. Continuing session connection...`));
    } else {
        console.error(chalk.red('❌ Web Server Error:'), err);
    }
});

export let client;
const startTime = Date.now();

async function startLuffyBot() {
    await initDatabase();
    await loadPlugins();

    if (!fs.existsSync(config.sessionDir)) {
        fs.mkdirSync(config.sessionDir, { recursive: true });
    }

    // 🔐 DECODE SESSION ID ENV STRING TO FILE
    const credsPath = path.join(config.sessionDir, 'creds.json');
    if (process.env.SESSION_ID && !fs.existsSync(credsPath)) {
        console.log(chalk.yellow('📦 SESSION_ID environment string parsing...'));
        try {
            const cleanedSession = process.env.SESSION_ID.replace(/LuffyTaro;;/g, '').trim();
            const sessionData = Buffer.from(cleanedSession, 'base64').toString('utf-8');
            fs.writeFileSync(credsPath, sessionData);
            console.log(chalk.bold.green('✅ Session restored successfully via credentials string!'));
        } catch (e) {
            console.log(chalk.red('❌ SESSION_ID decoding failure. Is your variable string intact?'));
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // 💻 UPGRADED: Added connection timeout safety configs for server drops
    client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: config.authType === 'qr',
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        connectTimeoutMs: 60000,       // Wait up to 60 seconds for handshake response
        defaultQueryTimeoutMs: 0,      // Disable quick queries timeout to prevent connection drop cycles
        keepAliveIntervalMs: 30000     // Keep websocket active via background heartbeats
    });

    // Handle Pairing Setup Scenario (Skipped if creds are active)
    if (config.authType === 'pairing' && !client.authState.creds.registered && !fs.existsSync(credsPath)) {
        setTimeout(async () => {
            const phoneNumber = config.ownerNumber.replace(/[^0-9]/g, '');
            if (!phoneNumber) {
                console.log(chalk.red('❌ OWNER_NUMBER must be populated in environment setup for pairing connection!'));
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

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && config.authType === 'qr' && !fs.existsSync(credsPath)) {
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
            
            const matchedCmd = commands.find(cmd => cmd.name === commandName || (cmd.aliases && cmd.aliases.includes(commandName)));
            
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
