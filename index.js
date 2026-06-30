require("dotenv").config();

console.log(`
╔══════════════════════════════╗
║      🤖 LuffyTaro Bot 🤖      ║
╠══════════════════════════════╣
║ Owner : Luffy                ║
║ Version : v1.0.0             ║
║ Status : Starting...         ║
╚══════════════════════════════╝
`);

try {
    require("./main");
} catch (err) {
    console.error("❌ Failed to start LuffyTaro Bot");
    console.error(err);
    process.exit(1);
}
