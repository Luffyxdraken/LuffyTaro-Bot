const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require('pino');

const config = {
    sessionDir: './sessions',
    authType: 'pairing', // pairing ya qr
    ownerNumber: process.env.OWNER_NUMBER || '',
};

async function startBot() {
    if (!fs.existsSync(config.sessionDir)) {
        fs.mkdirSync(config.sessionDir, { recursive: true });
    }

    // 🔐 SESSION LOAD: Base64 ENV se ya file se
    if (process.env.SESSION_ID && !fs.existsSync(path.join(config.sessionDir, 'creds.json'))) {
        console.log(chalk.yellow('📦 SESSION_ID env se session bana raha hu...'));
        try {
            const sessionData = Buffer.from(process.env.SESSION_ID, 'base64').toString('utf-8');
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
}

startBot();
