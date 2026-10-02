FROM node:22-bookworm-slim
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@11.0.9
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/website/package.json ./apps/website/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter @agendai/api build
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["pnpm", "start"]
