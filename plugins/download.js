import { registerCommand } from '../lib/plugins.js';
import axios from 'axios';

// Upgraded production-grade scraper engine utilizing alternative clean routes
async function fetchMediaStream(type, url, query = '') {
    // TIER 1: Maher-Zubair Main Edge Cluster
    try {
        if (type === 'ytsr') {
            const res = await axios.get(`https://api.maher-zubair.tech/search/ytsearch?q=${encodeURIComponent(query)}`);
            return res.data?.result?.[0]?.url || null;
        }
        
        if (type === 'ytmp3') {
            const res = await axios.get(`https://api.maher-zubair.tech/download/ytmp3?url=${encodeURIComponent(url)}`);
            return res.data?.result?.links?.[0]?.link || res.data?.result?.download_url || null;
        }

        if (type === 'ytmp4') {
            const res = await axios.get(`https://api.maher-zubair.tech/download/ytmp4?url=${encodeURIComponent(url)}`);
            return res.data?.result?.links?.[0]?.link || res.data?.result?.download_url || null;
        }

        if (type === 'tiktok') {
            const res = await axios.get(`https://api.maher-zubair.tech/download/tiktok?url=${encodeURIComponent(url)}`);
            return res.data?.result?.video || null;
        }

        if (type === 'instagram') {
            const res = await axios.get(`https://api.maher-zubair.tech/download/instagram?url=${encodeURIComponent(url)}`);
            return res.data?.result?.[0]?.url || null;
        }
    } catch (e) {
        console.warn(`Primary edge cluster dropped for ${type}, routing through secondary array...`);
    }

    // TIER 2: Itzpire Bypass Router
    try {
        if (type === 'ytsr') {
            const res = await axios.get(`https://itzpire.com/search/youtube?query=${encodeURIComponent(query)}`);
            return res.data?.data?.[0]?.url || null;
        }

        if (type === 'ytmp3') {
            const res = await axios.get(`https://itzpire.com/download/play-youtube?query=${encodeURIComponent(url)}`);
            return res.data?.data?.audio || null;
        }

        if (type === 'ytmp4') {
            const res = await axios.get(`https://itzpire.com/download/play-youtube?query=${encodeURIComponent(url)}`);
            return res.data?.data?.video || null;
        }
    } catch (e) {
        console.error(`CRITICAL: All fallback routes exhausted for target element class [${type}]:`, e.message);
        return null;
    }
}

// -------------------------------------------------------------
// MUSIC & VIDEO COMMANDS
// -------------------------------------------------------------

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
        if (!args[0]) return await client.sendMessage(from, { text: '⚠️ Provide an active TikTok video link.' });
        await client.sendMessage(from, { text: '📥 Processing TikTok CDN content distribution streams...' });
        
        const videoUrl = await fetchMediaStream('tiktok', args[0]);
        if (!videoUrl) return await client.sendMessage(from, { text: '❌ Failed to extract watermark-free asset stream.' }, { quoted: msg });
        
        await client.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
    }
});
