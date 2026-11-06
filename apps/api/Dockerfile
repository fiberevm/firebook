# One image for the API (which also serves the dashboard) and the price worker.
# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# workspace manifests, so the lockfile resolves
FROM base AS manifests
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

# build the dashboard into apps/web/dist
FROM manifests AS dashboard
RUN bun install --frozen-lockfile --filter '@accounting/web'
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN bun run --filter '@accounting/web' build

# production dependencies of the api and its workspace packages only
FROM manifests AS install
RUN bun install --frozen-lockfile --production --filter '@accounting/api'

FROM base AS release
COPY --from=install /usr/src/app ./
COPY apps/api apps/api
COPY packages packages
COPY --from=dashboard /usr/src/app/apps/web/dist apps/web/dist
ENV NODE_ENV=production
USER bun
EXPOSE 3000/tcp
# the worker overrides this with: bun apps/api/cmd/worker.ts
CMD ["bun", "apps/api/cmd/api.ts"]
