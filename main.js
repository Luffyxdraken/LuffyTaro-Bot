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

    // 💾 AUTO-SESSION RECOVERY LAYER
    if (!fs.existsSync(config.sessionDir)) {
        fs.mkdirSync(config.sessionDir, { recursive: true });
    }

    // Check if Render wiped your files but you have a SESSION_ID variable saved
    if (process.env.SESSION_ID && fs.readdirSync(config.sessionDir).length === 0) {
        try {
            console.log(chalk.cyan('📦 Ephemeral disk reset detected. Restoring WhatsApp session...'));
            
            // Decode the long text string back into real JSON
            const decodedSession = Buffer.from(process.env.SESSION_ID.trim(), 'base64').toString('utf-8');
            
            // Re-write your credentials file automatically
            fs.writeFileSync(path.join(config.sessionDir, 'creds.json'), decodedSession);
            console.log(chalk.green('✅ Session successfully synchronized from Render variables!'));
        } catch (e) {
            console.error(chalk.red('❌ Failed to extract session string structure: '), e);
        }
    }

    // Load the credentials securely
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // FIXED: Corrected Baileys ES module instantiation structure
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

    // 🔑 Handle Pairing Setup Scenario (Only triggers if SESSION_ID isn't set or valid)
    if (config.authType === 'pairing' && !client.authState.creds.registered) {
        setTimeout(async () => {
            const targetNumber = process.env.BOT_NUMBER || config.ownerNumber;
            const phoneNumber = targetNumber.replace(/[^0-9]/g, '');
            
            if (!phoneNumber) {
                console.log(chalk.red('❌ No phone number found to generate a pairing code!'));
                process.exit(1);
            }
            try {
                const code = await client.requestPairingCode(phoneNumber);
                console.log(chalk.bold.yellow('\n🤖 ---------------- LUFFYTARO PAIRING ENGINE ---------------- 🤖'));
                console.log(chalk.bold.white(`     Generating pairing code for WhatsApp Number: ${phoneNumber}`));
                console.log(chalk.bold.white(`     Use the code below to pair your bot within WhatsApp App:`));
                console.log(chalk.bold.cyan(`\n                     👉   ${code}   👈\n`));
                console.log(chalk.bold.yellow('-------------------------------------------------------------\n'));
            } catch (err) {
                console.error(chalk.red('Failed to request pairing code: '), err);
            }
        }, 3000);
    }

    // 💾 Save session tokens when updated
    client.ev.on('creds.update', saveCreds);

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
            
            // Extract raw string content
            const body = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         msg.message.imageMessage?.caption || 
                         msg.message.videoMessage?.caption || '';

            const prefix = config.prefix || '.';
            if (!body
