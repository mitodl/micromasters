FROM python:3.14-slim AS base

LABEL maintainer="ODL DevOps <mitx-devops@mit.edu>"

WORKDIR /tmp

COPY apt.txt /tmp/apt.txt
RUN apt-get update && \
    apt-get install --no-install-recommends -y $(grep -vE "^\s*#" apt.txt | tr "\n" " ") libpq-dev postgresql-client && \
    apt-get clean && \
    apt-get autoremove -y --purge && \
    rm -rf /var/lib/apt/lists/*

FROM base AS system

RUN mkdir /src && \
    adduser --disabled-password --gecos "" mitodl && \
    mkdir /var/media && chown -R mitodl:mitodl /var/media

FROM system AS uv

ENV \
  PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  UV_PROJECT_ENVIRONMENT="/opt/venv"
ENV PATH="/opt/venv/bin:$PATH"

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

COPY pyproject.toml uv.lock /src/

RUN chown -R mitodl:mitodl /src && \
    mkdir -p /opt/venv && \
    chown -R mitodl:mitodl /opt/venv

USER mitodl
WORKDIR /src
RUN uv sync --frozen --no-install-project --no-dev

FROM node:14.18.2 AS node_builder
COPY . /src
WORKDIR /src
RUN yarn install --immutable
RUN node node_modules/webpack/bin/webpack.js --config webpack.config.prod.js --bail

FROM uv AS code

COPY --chown=mitodl:mitodl . /src

# Set pip cache folder, as it is breaking pip when it is on a shared volume
ENV XDG_CACHE_HOME=/tmp/.cache

FROM code AS production

COPY --from=node_builder --chown=mitodl:mitodl /src/static/bundles /src/static/bundles
COPY --from=node_builder --chown=mitodl:mitodl /src/webpack-stats.json /src/webpack-stats.json

EXPOSE 8079
ENV PORT=8079
CMD ["uwsgi", "uwsgi.ini"]

FROM code AS development

RUN uv sync --frozen --no-install-project

EXPOSE 8079
ENV PORT=8079
CMD ["uwsgi", "uwsgi.ini"]
