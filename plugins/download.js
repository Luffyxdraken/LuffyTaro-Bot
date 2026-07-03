import { registerCommand } from '../lib/plugins.js';
import axios from 'axios';

registerCommand({
    name: 'play',
    aliases: ['song'],
    category: 'download',
    description: 'Fetch and parse standard streaming audio file requests directly.',
    execute: async ({ client, from, msg, args }) => {
        const query = args.join(' ');
        if (!query) return await client.sendMessage(from, { text: '⚠️ Please supply a song name or search query.' });
        
        await client.sendMessage(from, { text: `🔍 Searching and downloading \`${query}\` from streaming services...` });
        
        try {
            // Live Search Query Integration via a functional aggregate API endpoint
            const res = await axios.get(`https://api.vkrdown.com/api/ytsr?q=${encodeURIComponent(query)}`);
            const videoUrl = res.data?.data?.[0]?.url || res.data?.results?.[0]?.url;
            
            if (!videoUrl) throw new Error('No audio tracking assets mapped.');

            const dlRes = await axios.get(`https://api.vkrdown.com/api/ytmp3?url=${encodeURIComponent(videoUrl)}`);
            const audioUrl = dlRes.data?.data?.url || dlRes.data?.download?.url;

            if (!audioUrl) throw new Error('Resource streaming link resolution failed.');

            await client.sendMessage(from, { 
                audio: { url: audioUrl }, 
                mimetype: 'audio/mp4',
                ptt: false 
            }, { quoted: msg });
        } catch (e) {
            console.error(e);
            await client.sendMessage(from, { text: '❌ Failed to fetch audio stream. Please try a different title.' });
        }
    }
});

registerCommand({
    name: 'ytmp3',
    category: 'download',
    description: 'Converts targeted streaming addresses into portable audio files.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Please supply a valid YouTube link.' });
        await client.sendMessage(from, { text: '📥 Resolving YouTube audio content stream vectors...' });
        try {
            const dlRes = await axios.get(`https://api.vkrdown.com/api/ytmp3?url=${encodeURIComponent(args[0])}`);
            const audioUrl = dlRes.data?.data?.url || dlRes.data?.download?.url;
            if (!audioUrl) throw new Error();
            await client.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mp4' }, { quoted: msg });
        } catch {
            await client.sendMessage(from, { text: '❌ Unable to extract audio from link.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'ytmp4',
    category: 'download',
    description: 'Downloads media content sequences from web video addresses.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Please supply a valid YouTube link.' });
        await client.sendMessage(from, { text: '📥 Processing high definition video format allocation tracks...' });
        try {
            const dlRes = await axios.get(`https://api.vkrdown.com/api/ytmp4?url=${encodeURIComponent(args[0])}`);
            const videoUrl = dlRes.data?.data?.url || dlRes.data?.download?.url;
            if (!videoUrl) throw new Error();
            await client.sendMessage(from, { video: { url: videoUrl }, caption: '✅ Download complete!' }, { quoted: msg });
        } catch {
            await client.sendMessage(from, { text: '❌ Video download stream resolution failed.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'facebook',
    aliases: ['fb'],
    category: 'download',
    description: 'Facebook video scraper parsing pipeline tool.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Link required.' });
        await client.sendMessage(from, { text: '📥 Resolving remote Facebook video objects...' });
        try {
            const res = await axios.get(`https://api.vkrdown.com/api/facebook?url=${encodeURIComponent(args[0])}`);
            const videoUrl = res.data?.data?.url || res.data?.download?.url;
            if (!videoUrl) throw new Error();
            await client.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
        } catch {
            await client.sendMessage(from, { text: '❌ Could not retrieve Facebook asset media elements.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'instagram',
    aliases: ['ig'],
    category: 'download',
    description: 'Instagram reel fetch system pipeline.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Provide a valid Instagram URL.' });
        await client.sendMessage(from, { text: '📥 Pulling Instagram CDN edge cache paths...' });
        try {
            const res = await axios.get(`https://api.vkrdown.com/api/instagram?url=${encodeURIComponent(args[0])}`);
            const videoUrl = res.data?.data?.url || res.data?.download?.url;
            if (!videoUrl) throw new Error();
            await client.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
        } catch {
            await client.sendMessage(from, { text: '❌ Failed to parse media parameters from Instagram link.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'tiktok',
    category: 'download',
    description: 'Scrapes media metadata and video assets without watermarks.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Provide an active TikTok video link link.' });
        await client.sendMessage(from, { text: '📥 Processing TikTok CDN content distribution streams...' });
        try {
            const res = await axios.get(`https://api.vkrdown.com/api/tiktok?url=${encodeURIComponent(args[0])}`);
            const videoUrl = res.data?.data?.video || res.data?.download?.url;
            if (!videoUrl) throw new Error();
            await client.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
        } catch {
            await client.sendMessage(from, { text: '❌ Failed to extract watermark-free asset stream.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'spotify',
    category: 'download',
    description: 'Decrypts and downloads streaming metadata arrays.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Target tracking requires an explicit Spotify track link.' });
        await client.sendMessage(from, { text: '📥 Resolving track encoding layers from Spotify registries...' });
        try {
            const res = await axios.get(`https://api.vkrdown.com/api/spotify?url=${encodeURIComponent(args[0])}`);
            const audioUrl = res.data?.data?.url || res.data?.download?.url;
            if (!audioUrl) throw new Error();
            await client.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mp4' }, { quoted: msg });
        } catch {
            await client.sendMessage(from, { text: '❌ Spotify track compilation failed.' }, { quoted: msg });
        }
    }
});

registerCommand({
    name: 'mediafire',
    category: 'download',
    description: 'Mediafire storage cloud mirror handler tracking algorithm.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Target file configuration link is missing.' });
        await client.sendMessage(from, { text: '📥 Mirroring direct package allocation tracks from Mediafire...' });
        try {
            const res = await axios.get(`https://api.vkrdown.com/api/mediafire?url=${encodeURIComponent(args[0])}`);
            const docUrl = res.data?.data?.url || res.data?.download?.url;
            const name = res.data?.data?.filename || 'Mediafire_Download';
            if (!docUrl) throw new Error();
            await client.sendMessage(from, { document: { url: docUrl }, fileName: name, mimetype: 'application/octet-stream' }, { quoted: msg });
        } catch {
            await client.sendMessage(from, { text: '❌ Direct link parsing block encountered an error.' }, { quoted: msg });
        }
    }
});
