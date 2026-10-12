FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg openssl \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main' > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-17 \
    && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@11.0.9
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/website/package.json ./apps/website/package.json
COPY packages ./packages
RUN --mount=type=cache,id=agendai-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @agendai/api... --store-dir=/pnpm/store --fetch-timeout=300000 --fetch-retries=5
COPY apps/api ./apps/api
RUN pnpm --filter @agendai/api build
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV ADMIN_BACKUP_DIR=/var/lib/agendai/backups
RUN mkdir -p /var/lib/agendai/backups && chown -R node:node /var/lib/agendai && chmod 700 /var/lib/agendai/backups
EXPOSE 3001
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3001') + '/api/v1/health', {signal: AbortSignal.timeout(4000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
