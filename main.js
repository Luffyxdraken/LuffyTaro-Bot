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

// HTTP Health checks & Keep-Alive binding for Render
app.get('/', (req, res) => res.status(200).json({ status: 'online', bot: config.botName }));
app.listen(config.port, () => console.log(chalk.magenta(`🌐 Express monitor binding activated on port ${config.port}`)));

export let client;
const startTime = Date.now();

async function startLuffyBot() {
    await initDatabase();
    await loadPlugins();

    // 💾 Ensure directories exist
    if (!fs.existsSync(config.sessionDir)) {
        fs.mkdirSync(config.sessionDir, { recursive: true });
    }

    // 📦 FORCE-SYNC SESSION ID OVERWRITES
    if (process.env.SESSION_ID) {
        try {
            console.log(chalk.cyan('📦 Synchronizing session data from Render environment variables...'));
            // Remove quotation marks and white space that cloud hosts sometimes add
            const cleanSessionStr = process.env.SESSION_ID.replace(/["'\s]/g, '').trim();
            const decodedSession = Buffer.from(cleanSessionStr, 'base64').toString('utf-8');
            
            // Overwrite/Write creds file explicitly to assure system updates match
            fs.writeFileSync(path.join(config.sessionDir, 'creds.json'), decodedSession);
            console.log(chalk.green('✅ creds.json written successfully!'));
        } catch (e) {
            console.error(chalk.red('❌ Failed to extract session string structure: '), e);
        }
    }

    // Load credentials from disk
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // FIXED: Strong module mapping instance setup
    client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: config.authType === 'qr',
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    // 💾 Save session tokens when updated
    client.ev.on('creds.update', saveCreds);

    // 🔑 SECURE PAIRING CODE GUARD (Never run if creds exist)
    const hasCredsOnDisk = fs.existsSync(path.join(config.sessionDir, 'creds.json'));
    const isRegistered = client.authState?.creds?.registered || hasCredsOnDisk;

    if (config.authType === 'pairing' && !isRegistered) {
        setTimeout(async () => {
            // Re-read registration check right before triggering code
            if (client.authState?.creds?.registered) return;
            
            const targetNumber = process.env.BOT_NUMBER || config.ownerNumber;
            const phoneNumber = targetNumber.replace(/[^0-9]/g, '');
            
            if (!phoneNumber) {
                console.log(chalk.red('❌ No phone number found to generate a pairing code!'));
                process.exit(1);
            }
            try {
                const code = await client.requestPairingCode(phoneNumber);
                console.log(chalk.bold.yellow('\n🤖 ---------------- LUFFYTARO PAIRING ENGINE ---------------- 🤖'));
                console.log(chalk.bold.cyan(`\n                     👉   ${code}   👈\n`));
                console.log(chalk.bold.yellow('-------------------------------------------------------------\n'));
            } catch (err) {
                console.error(chalk.red('Failed to request pairing code: '), err);
            }
        }, 5000); // 5 second layout delay to allow websocket handshake confirmation
    } else {
        console.log(chalk.bold.green('💾 Valid session detected. Pairing Code Generation explicitly disabled.'));
    }

    // 📡 Handle Connection Updates (Disconnects & Reconnects)
    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            console.log(chalk.red(`🔌 Connection closed due to: ${lastDisconnect.error}. Reconnecting: ${shouldReconnect}`));
            if (shouldReconnect) {
                startLuffyBot();
            } else {
                console.log(chalk.bold.red('❌ Session completely logged out. Please clear cache and repair.'));
            }
        } else if (connection === 'open') {
            console.log(chalk.bold.green(`\n✅ ${config.botName} operational and bridged successfully via WebSocket!`));
        }
    });

    // 💬 MESSAGE INBOUND LISTENER (Commands router)
    client.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = isGroup ? (msg.key.participant || '') : from;
            
            const body = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         msg.message.imageMessage?.caption || 
                         msg.message.videoMessage?.caption || '';

            const prefix = config.prefix || '.';
            const isCmd = body.startsWith(prefix);
            if (!isCmd) return;

            const args = body.trim().split(/ +/).slice(1);
            const commandName = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();

            const cmd = commands.get(commandName) || commands.find(c => c.aliases && c.aliases.includes(commandName));

            if (cmd) {
                console.log(chalk.blue(`[COMMAND] Executing ${prefix}${commandName} from ${sender}`));
                await cmd.execute(client, msg, {
                    from,
                    isGroup,
                    sender,
                    args,
                    body,
                    commands
                });
            }
        } catch (err) {
            console.error(chalk.red('Error in messages.upsert routing structure: '), err);
        }
    });
}

// Fire up the engine
startLuffyBot();
