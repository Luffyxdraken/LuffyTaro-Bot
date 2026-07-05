import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db;
// In-memory cache layer to make synchronous reading work flawlessly with main.js loops
const cache = new Map();

// Synchronously ensure the database directory exists before loading begins
const dbDir = path.join(process.cwd(), 'sql');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// System Database initialization sequence
async function initDatabase() {
    db = await open({
        filename: path.join(dbDir, 'database.db'),
        driver: sqlite3.Database
    });

    // Generate structural table mapping keys if missing from schema arrays
    await db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            jid TEXT PRIMARY KEY,
            welcome TEXT DEFAULT 'false',
            goodbye TEXT DEFAULT 'false',
            antilink TEXT DEFAULT 'false',
            antidelete TEXT DEFAULT 'false',
            antispam TEXT DEFAULT 'false'
        )
    `);

    // Hydrate the in-memory memory cache with everything stored inside the db
    const rows = await db.all('SELECT * FROM settings');
    for (const row of rows) {
        cache.set(row.jid, row);
    }
    console.log('✅ Local SQL Configuration Array synced successfully.');
}

// Initialize database right away
initDatabase().catch(err => console.error('CRITICAL: Database boot failed:', err));

/**
 * Returns configuration vectors instantly from cache to avoid blocking the main message loop.
 */
export function getSettings(jid) {
    const defaultSettings = { 
        jid, 
        welcome: 'false', 
        goodbye: 'false', 
        antilink: 'false', 
        antidelete: 'false', 
        antispam: 'false' 
    };

    if (!cache.has(jid)) {
        // Set fallback mapping in memory immediately
        cache.set(jid, defaultSettings);
        
        // Fire-and-forget database insert so it saves in the background
        db?.run('INSERT OR IGNORE INTO settings (jid) VALUES (?)', [jid]).catch(() => {});
        return defaultSettings;
    }

    return cache.get(jid);
}

/**
 * Updates group parameters and saves changes safely to both memory cache and disk.
 */
export async function updateGroupSetting(jid, settingName, value) {
    const allowedColumns = ['welcome', 'goodbye', 'antilink', 'antidelete', 'antispam'];
    if (!allowedColumns.includes(settingName)) return false;

    // Ensure record existence before performing an update operation
    getSettings(jid);

    // Update internal memory reference cache instantly
    const cachedData = cache.get(jid);
    cachedData[settingName] = String(value);
    cache.set(jid, cachedData);

    // Persist changes cleanly down to disk
    if (db) {
        await db.run(`UPDATE settings SET ${settingName} = ? WHERE jid = ?`, [String(value), jid]);
    }
    return true;
}
