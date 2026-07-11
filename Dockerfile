FROM node:18-slim

RUN apt-get update && apt-get install -y \
    git \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .

RUN mkdir -p /data/session
CMD ["npm", "start"]
