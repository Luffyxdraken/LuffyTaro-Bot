import { registerCommand as coreRegister, commands as coreCommands } from '../main.js';

/**
 * Bridges the commands map tracking structure directly out to plugins.
 */
export const commands = coreCommands;

/**
 * Bridges the local command configurations from plugin files into the main system.
 * @param {Object} cmdObj - The command configurations structure.
 */
export function registerCommand(cmdObj) {
    coreRegister(cmdObj);
}
