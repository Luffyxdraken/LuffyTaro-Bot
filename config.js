require("dotenv").config();

module.exports = {
    BOT_NAME: process.env.BOT_NAME || "LuffyTaro Bot",
    OWNER_NAME: process.env.OWNER_NAME || "Luffy",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "917866052212",

    PREFIX: process.env.PREFIX || ".",

    MODE: process.env.MODE || "private",

    SESSION_ID: process.env.SESSION_ID || "",

    ALIVE_MESSAGE:
`🤖 LuffyTaro Bot

✅ Status : Online
👑 Owner : Luffy
⚡ Version : 1.0.0

Created by LuffyTaro`,

    FOOTER: "© LuffyTaro Bot"
};
