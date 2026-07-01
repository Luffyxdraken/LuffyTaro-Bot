import { registerCommand as coreRegister } from '../main.js';

/**
 * Bridges the local command configuration metadata from 
 * individual plugin files into the main system command maps.
 * * @param {Object} cmdObj - The command configurations structure.
 */
export function registerCommand(cmdObj) {
    coreRegister(cmdObj);
}
