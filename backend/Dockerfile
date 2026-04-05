FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads

EXPOSE 5001

CMD ["node", "dist/server.js"]