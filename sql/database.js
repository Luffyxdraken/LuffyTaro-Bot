import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db;

// Safe async database initialization tracking 
async function initDatabase() {
    db = await open({
        filename: path.join(process.cwd(), 'sql', 'database.db'),
        driver: sqlite3.Database
    });

    // Create settings table structure if it does not exist
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
}

// Auto running setup loop
initDatabase().catch(err => console.error('Database connection exception:', err));

// Mock synchronous wrapper matching your main.js call signatures perfectly
export function getSettings(jid) {
    // Returns default states instantly while background records write asynchronously
    // ensuring main.js execution loop never blocks
    const defaultSettings = { jid, welcome: 'false', goodbye: 'false', antilink: 'false', antidelete: 'false', antispam: 'false' };
    
    // Fire-and-forget sync handler block to safely create rows
    db?.get('SELECT * FROM settings WHERE jid = ?', [jid]).then(row => {
        if (!row) {
            db.run('INSERT INTO settings (jid) VALUES (?)', [jid]).catch(() => {});
        }
    }).catch(() => {});

    return defaultSettings;
}

export async function updateGroupSetting(jid, settingName, value) {
    // Safe dynamic column assignment tracking configurations securely
    const allowedColumns = ['welcome', 'goodbye', 'antilink', 'antidelete', 'antispam'];
    if (!allowedColumns.includes(settingName)) return false;

    await db.run('INSERT INTO settings (jid) VALUES (?) ON CONFLICT(jid) DO NOTHING', [jid]);
    await db.run(`UPDATE settings SET ${settingName} = ? WHERE jid = ?`, [value, jid]);
    return true;
}
