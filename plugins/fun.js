import { registerCommand } from '../lib/Handler.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

registerCommand({
    name: 'sticker',
    aliases: ['s'],
    category: 'fun',
    description: 'Converts images or videos directly to clean WhatsApp WebP stickers.',
    execute: async ({ client, from, msg }) => {
        try {
            const messageType = Object.keys(msg.message || {})[0];
            const isQuoted = messageType === 'extendedTextMessage' && msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const targetMessage = isQuoted ? msg.message.extendedTextMessage.contextInfo.quotedMessage : msg.message;
            const targetType = Object.keys(targetMessage || {})[0];

            if (targetType !== 'imageMessage' && targetType !== 'videoMessage') {
                return await client.sendMessage(from, { text: '🤖 Please reply to or send an *image/video* with `.sticker` to convert it.' }, { quoted: msg });
            }

            await client.sendMessage(from, { text: '⏳ Converting your media asset into a sticker...' }, { quoted: msg });

            const mediaData = targetMessage[targetType];
            const stream = await downloadContentFromMessage(mediaData, targetType === 'imageMessage' ? 'image' : 'video');
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tempInput = path.join(os.tmpdir(), `stick_in_${Date.now()}`);
            const tempOutput = path.join(os.tmpdir(), `stick_out_${Date.now()}.webp`);
            fs.writeFileSync(tempInput, buffer);

            const ffmpegCommand = targetType === 'videoMessage'
                ? `ffmpeg -i "${tempInput}" -vcodec libwebp -filter_complex "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -loop 0 -vsync 0 -an "${tempOutput}"`
                : `ffmpeg -i "${tempInput}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" "${tempOutput}"`;

            exec(ffmpegCommand, async (err) => {
                if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                if (err) {
                    return await client.sendMessage(from, { text: '❌ Conversion failed. Check that FFmpeg is installed on your server environment.' }, { quoted: msg });
                }
                const stickerBuffer = fs.readFileSync(tempOutput);
                await client.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
                if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
            });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ An error occurred while generating sticker block.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'toimg',
    category: 'fun',
    description: 'Decodes sticker objects converting them cleanly back to native image formats.',
    execute: async ({ client, from, msg }) => {
        try {
            const isQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const targetMessage = isQuoted ? msg.message.extendedTextMessage.contextInfo.quotedMessage : null;
            
            if (!targetMessage || !targetMessage.stickerMessage) {
                return await client.sendMessage(from, { text: '⚠️ Please reply directly to a *sticker* with `.toimg` to decode it.' }, { quoted: msg });
            }

            await client.sendMessage(from, { text: '🔄 Transforming sticker back to native image format...' }, { quoted: msg });

            const stream = await downloadContentFromMessage(targetMessage.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tempInput = path.join(os.tmpdir(), `st2im_in_${Date.now()}.webp`);
            const tempOutput = path.join(os.tmpdir(), `st2im_out_${Date.now()}.png`);
            fs.writeFileSync(tempInput, buffer);

            exec(`ffmpeg -i "${tempInput}" "${tempOutput}"`, async (err) => {
                if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                if (err) {
                    return await client.sendMessage(from, { text: '❌ Failed to decode WebP container format.' }, { quoted: msg });
                }
                const imgBuffer = fs.readFileSync(tempOutput);
                await client.sendMessage(from, { image: imgBuffer, caption: '✅ Sticker converted back to clean image format.' }, { quoted: msg });
                if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
            });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ Failed to process conversion command.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'quote',
    category: 'fun',
    description: 'Generates inspirational expressions randomly.',
    execute: async ({ client, from, msg }) => {
        const quotes = [
            "If you don't take risks, you can't create a future!",
            "Power isn't determined by your size, but by the size of your heart and dreams!",
            "Inherited Will, The Destiny of Age, and The Dreams of People. As long as people continue to pursue the meaning of Freedom, these things will never cease to be!"
        ];
        const selected = quotes[Math.floor(Math.random() * quotes.length)];
        await client.sendMessage(from, { text: `💬 *Words of Wisdom:* \n\n"${selected}"` }, { quoted: msg });
    }
});

registerCommand({
    name: 'truth',
    category: 'fun',
    description: 'Generates truth challenges.',
    execute: async ({ client, from, msg }) => {
        const truths = [
            "What is the most childish thing that you still do?",
            "Have you ever let someone take the blame for something you did?",
            "What is your ultimate hidden talent?"
        ];
        await client.sendMessage(from, { text: `🔮 *Truth Challenge:* ${truths[Math.floor(Math.random() * truths.length)]}` }, { quoted: msg });
    }
});

registerCommand({
    name: 'dare',
    category: 'fun',
    description: 'Generates competitive dare sequences.',
    execute: async ({ client, from, msg }) => {
        const dares = [
            "Send a voice note singing your favorite anime opening sequence raw.",
            "Change your profile bio statement configurations to 'I worship LuffyTaro Bot' for 24 hours.",
            "Text your closest friend a random confusing message without giving context parameters."
        ];
        await client.sendMessage(from, { text: `🔥 *Dare Challenge:* ${dares[Math.floor(Math.random() * dares.length)]}` }, { quoted: msg });
    }
});

registerCommand({
    name: 'ship',
    category: 'fun',
    description: 'Calculates dynamic match compatibilities.',
    execute: async ({ client, from, msg }) => {
        const percentage = Math.floor(Math.random() * 100) + 1;
        await client.sendMessage(from, { text: `❤️ *Compatibility Analyzer Index:* \n\nTarget profiles hold an explicit *${percentage}%* synchronization metric authorization index mapping configuration.` }, { quoted: msg });
    }
});

registerCommand({
    name: 'hack',
    category: 'fun',
    description: 'Simulates mock terminal penetration workflows.',
    execute: async ({ client, from, msg, args }) => {
        const target = args[0] || 'Unknown Subject';
        const steps = [
            `📡 Establishing local exploit injection vectors targeting: ${target}...`,
            '🔓 Bypassing cloud structural firewalls and proxy bypass matrices...',
            '💾 Extracting relational message databases and configurations indexes...',
            '🎯 Injection completed successfully. Subject identity mapped and catalogued.'
        ];
        
        let { key } = await client.sendMessage(from, { text: '⚙️ Initializing terminal operations...' });
        for (let step of steps) {
            await new Promise(r => setTimeout(r, 1500));
            await client.sendMessage(from, { text: step, edit: key });
        }
    }
});
