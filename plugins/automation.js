import { getConfig } from '../sql/database.js';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

// Helper function to generate the welcome/goodbye banner card image dynamically
async function generateBanner(sock, participantId, titleText, subtitleText) {
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, 800, 400);

  const logoPath = path.join(process.cwd(), 'logo.png');
  if (fs.existsSync(logoPath)) {
    try {
      const logoImg = await loadImage(logoPath);
      ctx.drawImage(logoImg, 50, 100, 200, 200);
    } catch (err) {
      console.log("Could not render logo.png:", err.message);
    }
  }

  let avatarUrl;
  try {
    avatarUrl = await sock.profilePictureUrl(participantId, 'image');
  } catch (e) {
    avatarUrl = 'https://i.imgur.com/8K6Zg8b.png'; 
  }

  try {
    const avatarImg = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(600, 180, 90, 0, Math.PI * 2, true); 
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, 510, 90, 180, 180); 
    ctx.restore();
  } catch (err) {
    console.log("Could not load user profile image, skipping circle render.");
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(titleText, 400, 320); 

  ctx.fillStyle = '#00ffcc'; 
  ctx.font = '28px sans-serif';
  ctx.fillText(subtitleText, 400, 360); 

  return canvas.toBuffer('image/jpeg');
}

export async function handleGroupParticipants(sock, update) {
  const { id, participants, action } = update;
  
  let config = { welcome_type: '1', goodbye_type: '1' };
  try {
    config = getConfig(id) || config;
  } catch (e) {
    // Falls back seamlessly if database configuration queries encounter an anomaly
  }

  for (const user of participants) {
    const jidNum = user.split('@')[0];

    if (action === 'add') {
      if (config.welcome_type === '1' || config.welcome_type === '2') {
        const title = "🏴‍☠️ WELCOME TO THE TEAM 🏴‍☠️";
        const subtitle = `@${jidNum}`;
        const captionText = `🏴‍☠️ Welcome @${jidNum} to the paid scrims arena! Read the rules and ready up.`;

        const imageBuffer = await generateBanner(sock, user, title, subtitle);
        await sock.sendMessage(id, { 
          image: imageBuffer, 
          caption: captionText, 
          mentions: [user] 
        });
      }
    } 
    
    else if (action === 'remove') {
      if (config.goodbye_type === '1' || config.goodbye_type === '2') {
        const title = "❌ ELIMINATED FROM SCRIMS ❌";
        const subtitle = `@${jidNum}`;
        const captionText = `❌ @${jidNum} has left the squad battlefield.`;

        const imageBuffer = await generateBanner(sock, user, title, subtitle);
        await sock.sendMessage(id, { 
          image: imageBuffer, 
          caption: captionText, 
          mentions: [user] 
        });
      }
    }
  }
}
