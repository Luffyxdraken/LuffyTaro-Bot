import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function startBot() {
    console.log(chalk.cyan('--------------------------------------------------'));
    console.log(chalk.bold.green('🚀 Initializing LuffyTaro Bot Supervisor Node...'));
    console.log(chalk.cyan('--------------------------------------------------'));

    const child = spawn('node', [path.join(__dirname, 'main.js')], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    child.on('message', (data) => {
        if (data === 'reset') {
            console.log(chalk.yellow('🔄 Reboot signal received. Restarting bot core...'));
            child.kill();
            startBot();
        }
    });

    child.on('exit', (code) => {
        if (code !== 0) {
            console.log(chalk.red(`⚠️ Core process exited with code ${code}. Auto-restarting...`));
            startBot();
        }
    });
}

startBot();
