# syntax=docker/dockerfile:1
# hadolint global ignore=DL3008

FROM mitodl/ol-python-base:3.11 AS base
LABEL maintainer="ODL DevOps <mitx-devops@mit.edu>"

# All required apt packages (git, curl, libjpeg-dev, zlib1g-dev, net-tools,
# build-essential, libpq-dev, postgresql-client) are in mitodl/ol-python-base:3.11.

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
ENV PATH="/opt/venv/bin:$PATH"

# ─── Dependency install ───────────────────────────────────────────────────────
FROM base AS deps

COPY --chown=mitodl:mitodl pyproject.toml uv.lock /src/

USER mitodl
WORKDIR /src
# BuildKit cache mount keeps the uv download cache across builds.
RUN --mount=type=cache,target=/opt/uv-cache,uid=1000,gid=1000 \
    uv sync --frozen --no-install-project --no-dev

# ─── Node / frontend asset build ─────────────────────────────────────────────
FROM node:14.18.2 AS node_builder
COPY . /src
WORKDIR /src
RUN yarn install --immutable
RUN node node_modules/webpack/bin/webpack.js --config webpack.config.prod.js --bail

# ─── Code stage ───────────────────────────────────────────────────────────────
FROM deps AS code

COPY --chown=mitodl:mitodl . /src
ENV XDG_CACHE_HOME=/tmp/.cache

# ─── Production target ────────────────────────────────────────────────────────
FROM code AS production

COPY --from=node_builder --chown=mitodl:mitodl /src/static/bundles /src/static/bundles
COPY --from=node_builder --chown=mitodl:mitodl /src/webpack-stats.json /src/webpack-stats.json

EXPOSE 8079
ENV PORT=8079
CMD ["sh", "-c", "exec granian --interface wsgi --host 0.0.0.0 --port ${PORT:-8079} --workers 2 micromasters.wsgi:application"]

# ─── Development target ───────────────────────────────────────────────────────
FROM code AS development

RUN --mount=type=cache,target=/opt/uv-cache,uid=1000,gid=1000 \
    uv sync --frozen --no-install-project

EXPOSE 8079
ENV PORT=8079
CMD ["sh", "-c", "exec granian --interface wsgi --host 0.0.0.0 --port ${PORT:-8079} --workers 2 micromasters.wsgi:application"]
