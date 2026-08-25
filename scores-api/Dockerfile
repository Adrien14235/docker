FROM node:22.14.0-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npm prune --omit=dev
FROM node:22.14.0-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "src/server.js"]
