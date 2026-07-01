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
    botNumber: process.env.BOT_NUMBER || '',
    ownerNumber: process.env.OWNER_NUMBER || '',
};

export const commands = new Map();

export function registerCommand(cmdObj) {
    if (cmdObj && cmdObj.name) {
        commands.set(cmdObj.name, cmdObj);
        if (cmdObj.aliases && Array.isArray(cmdObj.aliases)) {
            for (const alias of cmdObj.aliases) {
                commands.set(alias, cmdObj);
            }
        }
    }
}

async function loadPlugins() {
    const pluginsDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
        return;
    }

    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            const fileUrl = new URL(`./plugins/${file}`, import.meta.url).href;
            await import(fileUrl);
            console.log(chalk.green(`🔌 Loaded plugin: ${file}`));
        } catch (e) {
            console.error(chalk.red(`❌ Failed to load plugin ${file}:`), e);
        }
    }
}

async function startBot() {
    if (!fs.existsSync(config.sessionDir)) {
        fs.mkdirSync(config.sessionDir, { recursive: true, mode: 0o777 });
    }

    if (process.env.SESSION_ID && !fs.existsSync(path.join(config.sessionDir, 'creds.json'))) {
        console.log(chalk.yellow('📦 SESSION_ID env se session bana raha hu...'));
        try {
            const sessionData = Buffer.from(process.env.SESSION_ID.trim(), 'base64').toString('utf-8');
            fs.writeFileSync(path.join(config.sessionDir, 'creds.json'), sessionData, { mode: 0o666 });
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
        printQRInTerminal: false,
        // 💻 FIX: Changed 'LuffyBot' to 'Ubuntu' to pass standard verification checks
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    await loadPlugins();

    const credsPath = path.join(config.sessionDir, 'creds.json');
    const hasCredsOnDisk = fs.existsSync(credsPath);
    const isRegistered = state.creds?.registered || hasCredsOnDisk;

    if (config.authType === 'pairing' && !isRegistered) {
        setTimeout(async () => {
            if (client.authState.creds.registered) return;
            
            let targetPhone = config.botNumber.replace(/[^0-9]/g, '');
            if (targetPhone.startsWith('0')) {
                targetPhone = targetPhone.substring(1);
            }
            
            if (!targetPhone) {
                console.log(chalk.red('❌ CRITICAL ERROR: BOT_NUMBER env setting is missing or empty!'));
                process.exit(1);
            }
            
            console.log(chalk.cyan(`📡 Requesting pairing code specifically for Bot Number: ${targetPhone}`));
            try {
                const code = await client.requestPairingCode(targetPhone);
                console.log(chalk.bold.yellow('\n🤖 PAIRING CODE: ' + code.match(/.{1,4}/g).join('-') + '\n'));
            } catch (pairErr) {
                console.error(chalk.red('❌ WhatsApp registration server rejected request:'), pairErr);
            }
        }, 3000);
    } else {
        console.log(chalk.bold.green('💾 Session mila. Pairing skip.'));
    }

    client.ev.on('creds.update', async () => {
        await saveCreds();
    });

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red('Connection band:', lastDisconnect.error));
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(chalk.bold.green(`✅ LuffyTaro Bot fully loaded with ${commands.size} active routing commands!`));
        }
    });

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

            const runCmd = commands.get(cmdName);
            if (runCmd && typeof runCmd.execute === 'function') {
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
