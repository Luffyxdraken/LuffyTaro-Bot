import chalk from 'chalk'; // 👈 ye zaroori hai
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = [];

export function registerCommand(cmdObj) {
    if (cmdObj && cmdObj.name) {
        commands.push(cmdObj);
    }
}

export async function loadPlugins() {
    const commandsPath = path.join(__dirname, '../commands');
    if (!fs.existsSync(commandsPath)) {
        console.log(chalk.red('❌ Commands folder nahi mila:', commandsPath));
        return;
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    console.log(chalk.yellow(`📂 Found ${commandFiles.length} command files`));
    
    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = await import(`file://${filePath}`);
            if (command.default && command.default.name) {
                registerCommand(command.default);
            } else {
                console.log(chalk.red(`⚠️ ${file} mein export default nahi hai`));
            }
        } catch (e) {
            console.log(chalk.red(`❌ Error loading ${file}:`, e.message));
        }
    }
    console.log(chalk.green(`✅ Total ${commands.length} commands loaded`));
}
