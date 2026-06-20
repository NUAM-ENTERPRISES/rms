# ── Base: shared system deps for native modules (sharp, @napi-rs/canvas) ──
FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

# ── Dev: hot-reload local stack ─────────────────────────────────────────────
FROM base AS dev

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci

RUN npx prisma generate

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start:dev"]

# ── Builder: compile NestJS for production ──────────────────────────────────
FROM base AS builder

RUN npm ci

COPY . .

RUN npx prisma generate
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build
RUN test -f dist/main.js

# ── Prod: minimal runtime image ─────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS prod

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

RUN npx prisma generate

COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
