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

    await db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS groups (
            jid TEXT PRIMARY KEY,
            welcome INTEGER DEFAULT 0,
            goodbye INTEGER DEFAULT 0,
            antilink INTEGER DEFAULT 0,
            antidelete INTEGER DEFAULT 0,
            antispam INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS warnings (
            jid TEXT,
            user TEXT,
            count INTEGER DEFAULT 0,
            PRIMARY KEY (jid, user)
        );
    `);

    await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?,?)', ['mode', config.mode]);
    return db;
}

// Safety check so commands don't crash if DB not ready
function checkDb() {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first');
}

export async function getSetting(key) {
    checkDb();
    const row = await db.get('SELECT value FROM settings WHERE key =?', [key]);
    return row? row.value : null;
}

export async function setSetting(key, value) {
    checkDb();
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value]);
}

export async function getGroupSetting(jid) {
    checkDb();
    let row = await db.get('SELECT * FROM groups WHERE jid =?', [jid]);
    if (!row) {
        await db.run('INSERT INTO groups (jid) VALUES (?)', [jid]);
        row = { jid, welcome: 0, goodbye: 0, antilink: 0, antidelete: 0, antispam: 0 };
    }
    return row;
}

export async function updateGroupSetting(jid, key, value) {
    checkDb();

    // Whitelist allowed keys to prevent SQL injection
    const allowedKeys = ['welcome', 'goodbye', 'antilink', 'antidelete', 'antispam'];
    if (!allowedKeys.includes(key)) {
        throw new Error(`Invalid setting key: ${key}`);
    }

    await getGroupSetting(jid);
    await db.run(`UPDATE groups SET ${key} =? WHERE jid =?`, [value? 1 : 0, jid]);
}

export async function getWarns(jid, user) {
    checkDb();
    const row = await db.get('SELECT count FROM warnings WHERE jid =? AND user =?', [jid, user]);
    return row? row.count : 0;
}

export async function addWarn(jid, user) {
    checkDb();
    const current = await getWarns(jid, user);
    await db.run('INSERT OR REPLACE INTO warnings (jid, user, count) VALUES (?,?,?)', [jid, user, current + 1]);
    return current + 1;
}

export async function resetWarns(jid, user) {
    checkDb();
    await db.run('DELETE FROM warnings WHERE jid =? AND user =?', [jid, user]);
}
