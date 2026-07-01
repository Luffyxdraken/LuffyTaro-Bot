import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import pino from 'pino';

const config = {
    sessionDir: './sessions',
    authType: 'pairing', // pairing ya qr
    ownerNumber: process.env.OWNER_NUMBER || '',
};

async function startBot() {
    // Check if sessions directory exists, if not create it
    if (!fs.existsSync(config.sessionDir)) {
        fs.mkdirSync(config.sessionDir, { recursive: true });
    }

    // 🔐 SESSION LOAD: Base64 ENV se ya file se
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

    // 🔑 PAIRING CODE - Sirf tab jab session nahi hai
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
            console.log(chalk.bold.green('✅ Bot connected!'));
        }
    });

    // 💬 MESSAGE LISTENER / COMMANDS WORKING
    client.ev.on('messages.upsert', async (msg) => {
        try {
            const mek = msg.messages[0];
            if (!mek.message) return;
            
            // Text extract karna group ya personal chat se
            const messageType = Object.keys(mek.message)[0];
            const body = (messageType === 'conversation') ? mek.message.conversation : 
                         (messageType === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : 
                         (messageType === 'imageMessage') ? mek.message.imageMessage.caption : '';
            
            if (!body) return;

            const from = mek.key.remoteJid;
            const isCmd = body.startsWith('.'); // Prefix filter
            const command = isCmd ? body.slice(1).trim().split(/ +/).shift().toLowerCase() : null;
            
            // Simple Test Command Execution
            if (command === 'ping') {
                await client.sendMessage(from, { text: '🏓 Pong! LuffyTaro Bot online hai.' }, { quoted: mek });
            }

            if (command === 'hi' || command === 'hello') {
                await client.sendMessage(from, { text: '🍖 Yo! Main hu LuffyTaro Bot. Main kaise help karu?' }, { quoted: mek });
            }

        } catch (err) {
            console.error('Error processing message logic:', err);
        }
    });
}

startBot();
