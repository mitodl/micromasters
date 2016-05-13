#!/usr/bin/env bash
set -euf -o pipefail
set -a

. ./_osx_setup.sh

# Postgres is assumed to be running already
.venv/bin/python3 ./manage.py migrate
.venv/bin/python3 manage.py runserver 0.0.0.0:8079 &
export DJANGO_PID=$!

node ./node_modules/webpack-dev-server/bin/webpack-dev-server.js --config webpack.config.dev.js -d --content-base ./static --host 0.0.0.0 --port 8078 --progress --inline --hot &
export WEBPACK_PID=$!

trap "echo Killing Django $DJANGO_PID, Webpack $WEBPACK_PID; pkill -TERM -P $DJANGO_PID; pkill -TERM -P $WEBPACK_PID; echo Exiting..." INT TERM

echo "--- Servers are started"
wait $DJANGO_PID
wait $WEBPACK_PID

echo "--- Servers are stopped"
