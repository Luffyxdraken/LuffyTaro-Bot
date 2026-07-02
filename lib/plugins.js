import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.URL ? import.meta.url : __filename);
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
        console.log('❌ Commands folder nahi mila:', commandsPath);
        return;
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    console.log(`📂 Found ${commandFiles.length} command files`);
    
    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = await import(`file://${filePath}`);
            if (command.default && command.default.name) {
                registerCommand(command.default);
            } else {
                console.log(`⚠️ ${file} mein export default nahi hai`);
            }
        } catch (e) {
            console.log(`❌ Error loading ${file}:`, e.message);
        }
    }
    console.log(`✅ Total ${commands.length} commands loaded`);
}
