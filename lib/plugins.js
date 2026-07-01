// 📂 The real array that stores your 55 active plugin commands
export const commands = [];

/**
 * Registers an individual plugin command module into the system array.
 * @param {Object} cmdObj - The command configurations structure.
 */
export function registerCommand(cmdObj) {
    if (cmdObj && cmdObj.name) {
        commands.push(cmdObj);
    }
}

/**
 * Placeholder engine loader to ensure compatibility with main.js plugin workflows
 */
export async function loadPlugins() {
    // Your main.js handles file scanning, so this acts as an open channel bridge
    return true;
}
