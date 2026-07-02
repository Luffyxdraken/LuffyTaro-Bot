import { useMultiFileAuthState, fetchLatestBaileysVersion, makeWASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import * as config from './config.js'; //
import { commands, loadPlugins } from './lib/plugins.js';

let client;

async function startBot() {
    console.log('🚀 Bot start ho raha hai...');

    // 1. Session load
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);

    // 2. Version
    const { version } = await fetchLatestBaileysVersion();

    // 3. Socket banao
    client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: config.authType === 'qr',
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0
    });

    // 4. Creds save
    client.ev.on('creds.update', saveCreds);

    // 5. Commands load
    await loadPlugins();

    // 6. Connection event
    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && config.authType === 'qr') {
            console.log('📱 QR Scan karo');
        }

        if (connection === 'open') {
            console.log('✅ Bot connected!');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== 401;
            console.log('❌ Connection closed:', lastDisconnect?.error?.message);
            if (shouldReconnect) {
                console.log('🔄 Reconnecting...');
                startBot();
            }
        }
    });

    // 7. Message handler
    client.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

            if (!text.startsWith(config.prefix)) return;

            const args = text.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();

            const command = commands.find(c =>
                c.name === cmdName || (c.aliases && c.aliases.includes(cmdName))
            );

            if (command) {
                await command.execute({ client, msg, from, args, prefix: config.prefix });
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    });
}

startBot().catch(err => console.log('Fatal error:', err));
