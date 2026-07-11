import { getConfig } from '../sql/database.js';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

// Helper function to generate the welcome/goodbye banner card image dynamically
async function generateBanner(sock, participantId, titleText, subtitleText) {
  // 1. Create a canvas space (width: 800px, height: 400px)
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');

  // 2. Draw a dark slate background card
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, 800, 400);

  // 3. Draw your local Logo (logo.png) onto the left side of the canvas
  const logoPath = path.join(process.cwd(), 'logo.png');
  if (fs.existsSync(logoPath)) {
    try {
      const logoImg = await loadImage(logoPath);
      ctx.drawImage(logoImg, 50, 100, 200, 200); // position x=50, y=100, size=200x200
    } catch (err) {
      console.log("Could not render logo.png:", err.message);
    }
  }

  // 4. Fetch user's live WhatsApp Profile Picture
  let avatarUrl;
  try {
    avatarUrl = await sock.profilePictureUrl(participantId, 'image');
  } catch (e) {
    // Fallback if they have privacy settings blocking their photo
    avatarUrl = 'https://i.imgur.com/8K6Zg8b.png'; 
  }

  // 5. Draw the user's avatar as a perfect circle on the right side
  try {
    const avatarImg = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(600, 180, 90, 0, Math.PI * 2, true); // Create a circular clipping mask
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, 510, 90, 180, 180); // Draw avatar inside the circle
    ctx.restore();
  } catch (err) {
    console.log("Could not load user profile image, skipping circle render.");
  }

  // 6. Draw Text (Action title and user identifier)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(titleText, 400, 320); // main welcome text

  ctx.fillStyle = '#00ffcc'; // cool pirate neon cyan color
  ctx.font = '28px sans-serif';
  ctx.fillText(subtitleText, 400, 360); // prints user name/number string

  // Return the raw canvas output buffer to send via WhatsApp stream
  return canvas.toBuffer('image/jpeg');
}

export async function handleGroupParticipants(sock, update) {
  const { id, participants, action } = update;
  const config = getConfig(id);

  for (const user of participants) {
    const jidNum = user.split('@')[0];

    if (action === 'add') {
      if (config.welcome_type === '1' || config.welcome_type === '2') {
        const title = "🏴‍☠️ WELCOME TO THE TEAM 🏴‍☠️";
        const subtitle = `@${jidNum}`;
        const captionText = `🏴‍☠️ Welcome @${jidNum} to the paid scrims arena! Read the rules and ready up.`;

        // Generate the custom photo image buffer
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
        const title = "❌ ELIMINATED FROM SCARMS ❌";
        const subtitle = `@${jidNum}`;
        const captionText = `❌ @${jidNum} has left the squad battlefield.`;

        // Generate the custom photo image buffer
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
