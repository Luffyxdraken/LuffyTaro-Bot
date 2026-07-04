FROM node:18-slim

# Install system dependencies for audio/video processing and Baileys
RUN apt-get update && apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    git \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

# Create persistent data directory
RUN mkdir -p /data/session

CMD ["npm", "start"]
