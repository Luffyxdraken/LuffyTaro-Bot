import fs from 'fs';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== RENDER KE LIYE CODE START ==========
const PORT = process.env.PORT || 3000;

// Agar Render ke Environment Variable me SESSION_ID hai to creds.json bana de
if(process.env.SESSION_ID) {
    fs.writeFileSync(path.join(__dirname, 'creds.json'), process.env.SESSION_ID);
    console.log(chalk.green('✅ creds.json created from SESSION_ID env variable'));
}

// Render ko "bot zinda hai" batane ke liye chhota web server
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('🚀 LuffyTaro Bot Supervisor Running ✅');
}).listen(PORT, () => {
    console.log(chalk.blue(`🌐 Supervisor web server listening on port ${PORT}`));
});
// ========== RENDER KE LIYE CODE END ==========

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
