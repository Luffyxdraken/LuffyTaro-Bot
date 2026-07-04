import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Export the commands array so main.js can read it
export const commands = [];

// 2. Export registerCommand so group.js can use it
export function registerCommand(cmd) {
    commands.push(cmd);
    console.log(chalk.green(`  ✓ Registered: ${cmd.name}`));
}

// 3. Your loadPlugins with cache bust + error handling
export async function loadPlugins() {
    const commandsDir = path.join(__dirname, '../commands');
    console.log(chalk.blue('⚙️ Scanning folder:', commandsDir));
    
    if (!fs.existsSync(commandsDir)) {
        console.log(chalk.red('Commands folder not found!'));
        return;
    }
    
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    console.log(chalk.yellow('Found files:', files.join(', ') || 'none'));
    
    for (const file of files) {
        try {
            // ?update prevents cache so changes reload
            await import(`../commands/${file}?update=${Date.now()}`);
        } catch (err) {
            console.log(chalk.red(`  ✗ Failed: ${file}`), err.message);
        }
    }
    console.log(chalk.green(`\n✅ Total commands loaded: ${commands.length}\n`));
}
