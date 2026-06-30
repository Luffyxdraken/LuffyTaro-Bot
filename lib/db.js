import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

let db;

export async function initDatabase() {
    const dir = path.dirname(config.databasePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = await open({
        filename: config.databasePath,
        driver: sqlite3.Database
    });

    // Create system metadata tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS groups (
            jid TEXT PRIMARY KEY,
            welcome TEXT DEFAULT 'false',
            goodbye TEXT DEFAULT 'false',
            antilink TEXT DEFAULT 'false',
            antidelete TEXT DEFAULT 'false',
            antispam TEXT DEFAULT 'false'
        );
        CREATE TABLE IF NOT EXISTS warnings (
            jid TEXT,
            user TEXT,
            count INTEGER DEFAULT 0,
            PRIMARY KEY (jid, user)
        );
    `);
    
    // Seed initial app mode
    await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['mode', config.mode]);
    return db;
}

export async function getSetting(key) {
    const row = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
}

export async function setSetting(key, value) {
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function getGroupSetting(jid) {
    let row = await db.get('SELECT * FROM groups WHERE jid = ?', [jid]);
    if (!row) {
        await db.run('INSERT INTO groups (jid) VALUES (?)', [jid]);
        row = { jid, welcome: 'false', goodbye: 'false', antilink: 'false', antidelete: 'false', antispam: 'false' };
    }
    return row;
}

export async function updateGroupSetting(jid, key, value) {
    await getGroupSetting(jid); // Ensures entry exists
    await db.run(`UPDATE groups SET ${key} = ? WHERE jid = ?`, [value, jid]);
}

export async function getWarns(jid, user) {
    const row = await db.get('SELECT count FROM warnings WHERE jid = ? AND user = ?', [jid, user]);
    return row ? row.count : 0;
}

export async function addWarn(jid, user) {
    const current = await getWarns(jid, user);
    await db.run('INSERT OR REPLACE INTO warnings (jid, user, count) VALUES (?, ?, ?)', [jid, user, current + 1]);
    return current + 1;
}

export async function resetWarns(jid, user) {
    await db.run('DELETE FROM warnings WHERE jid = ? AND user = ?', [jid, user]);
}
