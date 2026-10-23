FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY game ./game
COPY scripts ./scripts
ENV NODE_ENV=production
CMD ["node", "scripts/serve-game.mjs"]
