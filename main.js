import { useMultiFileAuthState, fetchLatestBaileysVersion, makeWASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import * as config from './config.js'; //
import { commands, loadPlugins } from './lib/plugins.js';

let client;

async function startBot() {
    console.log('🚀 Bot start ho raha hai...');

    // 1. Session load
const sessionPath = config.sessionDir || './sessions'; // 👈 fallback
const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // 2. Version
    const { version } = await fetchLatestBaileysVersion();

    // 3. Socket banao
   const client = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false, // 👈 QR bilkul band
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    generateHighQualityLinkPreview: true
});

// 👇 YE NAYA CODE - Pairing code wala
if (config.authType === 'pairing' &&!client.authState.creds.registered) {
    const phoneNumber = config.owner[0]; // owner ka number lega
    console.log(`📞 Pairing code generate ho raha hai number: ${phoneNumber} ke liye...`);

    setTimeout(async () => {
        const code = await client.requestPairingCode(phoneNumber);
        console.log(`\n🔑 PAIRING CODE: ${code} 🔑\n`);
        console.log(`WhatsApp > Linked Devices > Link with phone number > Code daal de\n`);
    }, 3000);
}
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

        // 1. Bot khud ko message bhejega
        const myJid = client.user.id.split(':')[0] + '@s.whatsapp.net';

        const menu = `🤖 *BOT ACTIVE HAI* 🤖

*Owner:* ${config.owner[0]}
*Prefix:* ${config.prefix}
*Status:* Online ✅

*Available Commands:*
${config.prefix}hi - Bot se hello bolo 👋
${config.prefix}ping - Latency check 🏓

*Menu:*
${config.prefix}menu - Ye menu dubara dekho

Bot successfully connected ho gaya hai!`;

        // Khud ko message
        await client.sendMessage(myJid, { text: menu });
        console.log('📤 Khud ko active message bheja');

        // 2. Owner ko message bhejega
        for (let num of config.owner) {
            const ownerJid = num + '@s.whatsapp.net';
            try {
                await client.sendMessage(ownerJid, { text: `✅ *Bot Active Ho Gaya!*\n\n` + menu });
                console.log(`📤 Owner ${num} ko message bheja`);
            } catch (e) {
                console.log(`Owner ${num} ko message nahi gaya:`, e.message);
            }
        }
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
