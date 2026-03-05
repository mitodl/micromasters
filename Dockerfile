FROM python:3.11-bullseye
LABEL maintainer "ODL DevOps <mitx-devops@mit.edu>"


# Add package files, install updated node and pip
WORKDIR /tmp

COPY apt.txt /tmp/apt.txt
RUN apt-get update
RUN apt-get install -y $(grep -vE "^\s*#" apt.txt  | tr "\n" " ")

RUN apt-get update && apt-get install libpq-dev postgresql-client -y

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Add, and run as, non-root user.
RUN mkdir /src
RUN adduser --disabled-password --gecos "" mitodl
RUN mkdir /var/media && chown -R mitodl:mitodl /var/media

ENV UV_PROJECT_ENVIRONMENT="/opt/venv"
ENV PATH="/opt/venv/bin:$PATH"

# Install project packages
COPY pyproject.toml uv.lock /src/
WORKDIR /src
RUN uv sync --frozen --no-install-project

# Add project
COPY . /src
WORKDIR /src
RUN chown -R mitodl:mitodl /src

RUN apt-get clean && apt-get purge
USER mitodl

# Set pip cache folder, as it is breaking pip when it is on a shared volume
ENV XDG_CACHE_HOME /tmp/.cache

EXPOSE 8079
ENV PORT 8079
CMD uwsgi uwsgi.ini
