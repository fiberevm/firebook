# Builds the API (default) and the price worker.
# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install production dependencies of the api and its workspace packages only
FROM base AS install
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --production --filter '@accounting/api'

FROM base AS release
COPY --from=install /usr/src/app ./
COPY apps/api apps/api
COPY packages packages
ENV NODE_ENV=production
USER bun
EXPOSE 3000/tcp
# the worker overrides this with: bun apps/api/cmd/worker.ts
CMD ["bun", "apps/api/cmd/api.ts"]
