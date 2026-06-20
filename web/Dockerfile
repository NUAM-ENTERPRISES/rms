# ── Dev: Vite dev server with hot reload ────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ── Builder: production static assets ───────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_WS_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# ── Prod: nginx serving built assets ────────────────────────────────────────
FROM public.ecr.aws/docker/library/nginx:alpine AS prod

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
