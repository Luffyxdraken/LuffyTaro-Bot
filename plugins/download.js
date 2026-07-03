import { registerCommand } from '../lib/plugins.js';
import axios from 'axios';

// A resilient helper function that attempts multiple free download servers
async function fetchMediaStream(type, url, query = '') {
    // 1. Primary endpoint cluster configs
    try {
        if (type === 'ytsr') {
            const res = await axios.get(`https://api.vkrdown.com/api/ytsr?q=${encodeURIComponent(query)}`);
            return res.data?.data?.[0]?.url || res.data?.results?.[0]?.url || null;
        }
        
        const res = await axios.get(`https://api.vkrdown.com/api/${type}?url=${encodeURIComponent(url)}`);
        const targetUrl = res.data?.data?.url || res.data?.download?.url || res.data?.data?.video;
        if (targetUrl) return targetUrl;
    } catch (e) {
        console.warn(`Primary API tier error for ${type}, shifting to fallback pipelines...`);
    }

    // 2. Fallback secondary endpoint cluster configs (Dreaded Public Engine API)
    try {
        if (type === 'ytsr') {
            const fallbackSearch = await axios.get(`https://api.dreaded.site/api/ytsr?query=${encodeURIComponent(query)}`);
            return fallbackSearch.data?.result?.[0]?.url || null;
        }
        
        // Adjust standard name properties to match target fallback routers
        const routerName = type === 'ytmp3' ? 'ytaudio' : type === 'ytmp4' ? 'ytvideo' : type;
        const res = await axios.get(`https://api.dreaded.site/api/${routerName}?url=${encodeURIComponent(url)}`);
        return res.data?.result?.downloadUrl || res.data?.result?.url || null;
    } catch (e) {
        console.error('All media stream extraction channels failed.', e);
        return null;
    }
}

registerCommand({
    name: 'play',
    aliases: ['song'],
    category: 'download',
    description: 'Fetch and parse standard streaming audio file requests directly.',
    execute: async ({ client, from, msg, args }) => {
        const query = args.join(' ');
        if (!query) return await client.sendMessage(from, { text: '⚠️ Please supply a song name or search query.' });
        
        await client.sendMessage(from, { text: `🔍 Searching and resolving stream files for: \`${query}\`...` });
        
        try {
            // Locate the YouTube URL
            const videoUrl = await fetchMediaStream('ytsr', null, query);
            if (!videoUrl) throw new Error('No search tracks mapped.');

            // Fetch the high quality audio stream
            const audioUrl = await fetchMediaStream('ytmp3', videoUrl);
            if (!audioUrl) throw new Error('Audio conversion failed.');

            await client.sendMessage(from, { 
                audio: { url: audioUrl }, 
                mimetype: 'audio/mp4',
                ptt: false 
            }, { quoted: msg });
        } catch (e) {
            await client.sendMessage(from, { text: '❌ All streaming engines failed to fetch this audio stream. Please try a different song title.' }, { quoted: msg });
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
        
        const audioUrl = await fetchMediaStream('ytmp3', args[0]);
        if (!audioUrl) return await client.sendMessage(from, { text: '❌ Unable to extract audio from link using current system configurations.' }, { quoted: msg });
        
        await client.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mp4' }, { quoted: msg });
    }
});

registerCommand({
    name: 'ytmp4',
    category: 'download',
    description: 'Downloads media content sequences from web video addresses.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Please supply a valid YouTube link.' });
        await client.sendMessage(from, { text: '📥 Processing high definition video format allocation tracks...' });
        
        const videoUrl = await fetchMediaStream('ytmp4', args[0]);
        if (!videoUrl) return await client.sendMessage(from, { text: '❌ Video download stream resolution failed.' }, { quoted: msg });
        
        await client.sendMessage(from, { video: { url: videoUrl }, caption: '✅ Download complete!' }, { quoted: msg });
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
        
        const videoUrl = await fetchMediaStream('facebook', args[0]);
        if (!videoUrl) return await client.sendMessage(from, { text: '❌ Could not retrieve Facebook asset media elements.' }, { quoted: msg });
        
        await client.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
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
        
        const videoUrl = await fetchMediaStream('instagram', args[0]);
        if (!videoUrl) return await client.sendMessage(from, { text: '❌ Failed to parse media parameters from Instagram link.' }, { quoted: msg });
        
        await client.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
    }
});

registerCommand({
    name: 'tiktok',
    category: 'download',
    description: 'Scrapes media metadata and video assets without watermarks.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Provide an active TikTok video link link.' });
        await client.sendMessage(from, { text: '📥 Processing TikTok CDN content distribution streams...' });
        
        const videoUrl = await fetchMediaStream('tiktok', args[0]);
        if (!videoUrl) return await client.sendMessage(from, { text: '❌ Failed to extract watermark-free asset stream.' }, { quoted: msg });
        
        await client.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
    }
});

registerCommand({
    name: 'spotify',
    category: 'download',
    description: 'Decrypts and downloads streaming metadata arrays.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Target tracking requires an explicit Spotify track link.' });
        await client.sendMessage(from, { text: '📥 Resolving track encoding layers from Spotify registries...' });
        
        const audioUrl = await fetchMediaStream('spotify', args[0]);
        if (!audioUrl) return await client.sendMessage(from, { text: '❌ Spotify track compilation failed.' }, { quoted: msg });
        
        await client.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mp4' }, { quoted: msg });
    }
});

registerCommand({
    name: 'mediafire',
    category: 'download',
    description: 'Mediafire storage cloud mirror handler tracking algorithm.',
    execute: async ({ client, from, msg, args }) => {
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Target file configuration link is missing.' });
        await client.sendMessage(from, { text: '📥 Mirroring direct package allocation tracks from Mediafire...' });
        
        const docUrl = await fetchMediaStream('mediafire', args[0]);
        if (!docUrl) return await client.sendMessage(from, { text: '❌ Direct link parsing block encountered an error.' }, { quoted: msg });
        
        await client.sendMessage(from, { document: { url: docUrl }, fileName: 'Mediafire_Download.zip', mimetype: 'application/octet-stream' }, { quoted: msg });
    }
});
