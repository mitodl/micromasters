#!/bin/bash
set -ef -o pipefail

# Define some environment variables to figure out where we are running
source ./scripts/envs.sh

WEBPACK_HOST='0.0.0.0'
WEBPACK_PORT='8078'

# The webpack server should only be run in one of two cases:
#    1) We are running Linux and inside the Docker container
#    2) We're on an OSX host machine. Our current workflow for developing on a Docker container involves running
#       the webpack server on the host machine rather than the container.
# If neither of those are true, running this script is basically a no-op.

if [[ "$IS_OSX" == "true" && "$INSIDE_CONTAINER" == "true" ]] ; then
  echo -e "EXITING WEBPACK STARTUP SCRIPT\nOSX Users: The webpack dev server should be run on your host machine."
else
  if [[ "$1" == "--install" ]] ; then
    yarn install --frozen-lockfile && echo "Finished yarn install"
  fi
  # Start the webpack dev server on the appropriate host and port
  node ./hot-reload-dev-server.js --host "$WEBPACK_HOST" --port "$WEBPACK_PORT"
fi
