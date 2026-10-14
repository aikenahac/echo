FROM node:24-alpine AS base

# Install pnpm (version pinned by "packageManager" in package.json)
RUN corepack enable

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Public (client-side) configuration is inlined at build time.
# Secrets are NOT build args: they are only needed at runtime (see .env / compose).
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ARG NEXT_PUBLIC_BASE_URL
# Public bucket URL, used to allow uploaded images in next/image
ARG AWS_S3_PUBLIC_URL

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Set environment variables for the build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV AWS_S3_PUBLIC_URL=$AWS_S3_PUBLIC_URL

# Build the application
RUN pnpm build

# Compile the migration script and install only its runtime dependencies
# (same versions as the app) next to it
RUN pnpm exec tsc src/db/migrate.ts --outDir dist --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck \
  && cd dist \
  && echo '{"private":true}' > package.json \
  && npm install --omit=dev --no-audit --no-fund --no-package-lock \
    "drizzle-orm@$(node -p "require('../node_modules/drizzle-orm/package.json').version")" \
    "postgres@$(node -p "require('../node_modules/postgres/package.json').version")"

# Production image, copy all the files and run next
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations (applied by CMD before the server starts)
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Apply pending migrations, then start the application
CMD ["sh", "-c", "node dist/migrate.js && exec node server.js"]
