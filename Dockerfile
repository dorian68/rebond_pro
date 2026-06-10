# Image de production RebondPro Formation (Next.js 16, sortie "standalone").
# Build multi-étapes : deps -> builder -> runner (image finale minimale).

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# --- Dépendances ---
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# --- Build ---
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Valeurs factices VALIDES (format) juste pour passer la collecte des routes Next.
# Aucune connexion réelle n'est faite au build. Les vraies valeurs sont injectées au runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-secret-please-override"
RUN npm run build

# --- Runtime (minimal) ---
FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sortie standalone : server.js + node_modules tracés
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Garantit la présence du moteur Prisma (parfois non tracé par le standalone)
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma

USER node
EXPOSE 3000
CMD ["node", "server.js"]
