#!/usr/bin/env bash
set -euf -o pipefail
set -a

export NODE_ENV=development
export DEBUG=True
export PORT=8079
export COVERAGE_DIR=htmlcov
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
export MICROMASTERS_USE_WEBPACK_DEV_SERVER=True
export MICROMASTERS_SECURE_SSL_REDIRECT=False
export MICROMASTERS_DB_DISABLE_SSL=True

# Workaround for a python package complaining about uwsgi not having a compiler
# http://stackoverflow.com/questions/11669594/error-while-installing-uwsgi-on-mac
export CC=gcc

source .env

# Before this script is run make sure that:
# - Python3 is installed from the official Python 3 installer
# - Postgres 9.x is installed
# - A user 'postgres' exists with password 'postgres'

if ! which psql
then
    echo "postgres must be installed first."
    exit 1
fi

if ! which python3
then
    echo "Python 3 must be installed first."
    exit 1
fi

if ! which npm
then
    echo "Node JS must be installed first."
    exit 1
fi

if [[ ! -d ".venv" ]]
then
    virtualenv .venv -p $(which python3)
fi

# Update requirements (should be fast if already present)
.venv/bin/pip install -r requirements.txt
.venv/bin/pip install -r test_requirements.txt

npm install

# required to link with libsass
npm rebuild node-sass
