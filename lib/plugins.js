import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = [];

export function registerCommand(cmdObj) {
    commands.push(cmdObj);
}

export async function loadPlugins() {
    const pluginsDir = path.join(__dirname, '../plugins');
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir);
    }

    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    
    console.log(chalk.blue('⚙️  Loading plugins context...'));
    for (const file of files) {
        try {
            await import(`../plugins/${file}?update=${Date.now()}`);
            console.log(chalk.green(`  Loaded plugin: ${file}`));
        } catch (err) {
            console.log(chalk.red(`  Failed to load plugin ${file}:`), err);
        }
    }
    console.log(chalk.blue(`✅ Total active command modules: ${commands.length}`));
}
