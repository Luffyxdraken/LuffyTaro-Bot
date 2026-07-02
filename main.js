import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import * as config from './config.js';
import { loadPlugins, commands } from './lib/plugins.js'; // 👈 commands bhi import kar

await loadPlugins(); // ✅ 1 baar file start hote hi

async function startBot() {
    console.log('🚀 Bot start ho raha hai...');

    // 1. Session load - SIRF 1 BAAR
    const sessionPath = config.sessionDir || './sessions';
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // 2. Version
    const { version } = await fetchLatestBaileysVersion();

    // 3. Socket banao - SIRF 1 BAAR
    const client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        generateHighQualityLinkPreview: true
    });

    // 4. Creds save
    client.ev.on('creds.update', saveCreds);

    // 5. Pairing code wala code
    if (config.authType === 'pairing' &&!client.authState.creds.registered) {
        const phoneNumber = config.owner[0];
        console.log(`📞 Pairing code generate ho raha hai number: ${phoneNumber} ke liye...`);
        setTimeout(async () => {
            const code = await client.requestPairingCode(phoneNumber);
            console.log(`\n🔑 PAIRING CODE: ${code} 🔑\n`);
            console.log(`WhatsApp > Linked Devices > Link with phone number > Code daal de\n`);
        }, 3000);
    }

    // 6. Connection event
    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log('✅ Bot connected!');

            const myJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
            const menu = `🤖 *BOT ACTIVE HAI* 🤖\n\n*Owner:* ${config.owner[0]}\n*Prefix:* ${config.prefix}\n*Status:* Online ✅\n\n*Commands:*\n${config.prefix}hi\n${config.prefix}ping\n${config.prefix}menu`;

            await client.sendMessage(myJid, { text: menu });
            console.log('📤 Khud ko active message bheja');

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
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            console.log('❌ Connection closed:', lastDisconnect?.error?.output?.statusCode);
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
