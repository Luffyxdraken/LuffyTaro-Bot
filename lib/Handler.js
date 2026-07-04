import fs from 'fs';
import path from 'path';

export const commands = new Map();

// Simplified functional wrapper to register commands instantly
export function registerCommand(cmdObj) {
  commands.set(cmdObj.pattern, cmdObj);
}

// Auto-loads all plugin files dynamically without breaking on syntax errors
export async function loadPlugins() {
  const pluginsDir = path.join(process.cwd(), 'plugins');
  if (!fs.existsSync(pluginsDir)) return;

  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      await import(`../plugins/${file}?update=${Date.now()}`);
    } catch (err) {
      console.error(`❌ Failed to load plugin ${file}:`, err.message);
    }
  }
  console.log(`🚀 Loaded ${commands.size} commands successfully.`);
}

