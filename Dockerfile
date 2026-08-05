# syntax=docker/dockerfile:1

# =====================================================================
# Production image for Github Repositories Viewer.
#
# Built in GitHub Actions (see .github/workflows/deploy.yml) and pushed to
# GHCR; Dokploy only pulls and runs it. Previously Dokploy built this on the
# production box with nixpacks, which put a full `next build` on the same
# CPU and RAM as the live site on every push.
#
# Dependencies are installed with bun, because bun.lock is the source of truth
# for this repo. The build and the server then run on Node: bun segfaults
# inside `next build` for some of these apps (verified on both amd64 and
# arm64), and Node is what Next targets anyway.
# =====================================================================
# Both Node stages resolve the same base through one ARG so they cannot drift
# apart, and so there is a single place to pin. Override to pin an exact image:
#   docker build --build-arg NODE_IMAGE=node:22-slim@sha256:<digest> .
ARG BUN_IMAGE=oven/bun:1
ARG NODE_IMAGE=node:22-slim

FROM ${BUN_IMAGE} AS dependencies
WORKDIR /app

# Dependencies first so this layer caches until the lockfile moves.
# --ignore-scripts: nothing here needs a postinstall, and running one on a
# toolchain-free base is a failure waiting to happen.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Build-time values. NEXT_PUBLIC_* is inlined into the client bundle, so it has
# to be present now rather than at container start.
ARG NEXT_PUBLIC_GITHUB_CLIENT_ID
ARG NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_GITHUB_CLIENT_ID=$NEXT_PUBLIC_GITHUB_CLIENT_ID \
    NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY

# Fail the build rather than inline an empty per-environment value.
RUN test -n "$NEXT_PUBLIC_ENCRYPTION_KEY" || { echo "NEXT_PUBLIC_ENCRYPTION_KEY build-arg is required"; exit 1; }

# `next build` imports server modules to collect route metadata, so anything
# evaluated at import time has to be satisfiable. These placeholders are scoped
# to this RUN, so they never land in the image's ENV; the real values arrive
# from Dokploy as container env when the container starts.
#
# `npm run build` rather than `next build` directly, so the package.json build
# script (and any flags it carries) stays the single definition of the build.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    GITHUB_CLIENT_SECRET=build-time-placeholder \
    OPENAI_API_KEY=build-time-placeholder \
    npm run build

# =====================================================================
# Runtime — `output: "standalone"` (see next.config) emits server.js plus only
# the dependencies Next traced as reachable, so the runtime stage does not need
# node_modules at all.
# =====================================================================
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# The base image ships an unprivileged `node` user (uid/gid 1000) but still
# defaults to root. Copy with that ownership and drop to it, so the server does
# not run as root inside the container. Ownership matters as well as the USER:
# Next writes into .next at runtime.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node

EXPOSE 3000

# Serve only — the same thing nixpacks did. `db:migrate` is still run by hand
# against this app's database; nothing migrates on boot, so a deploy can never
# change the schema on its own.
CMD ["node", "server.js"]
