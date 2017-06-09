#!/usr/bin/env bash
set -e -o pipefail

# Where are we running?
if [[ ! -z "$DOCKER_HOST" && "$DOCKER_HOST" != "missing" ]]
then
    # OS X, either container or host but docker-machine is set up beforehand
    IS_OSX="true"
elif [[ $(uname -s) == "Darwin" ]]
then
    # OS X host, docker-machine is not configured
    IS_OSX="true"
else
    IS_OSX="false"
fi

if [[ -e "/.dockerenv" ]]
then
  INSIDE_CONTAINER="true"
else
  INSIDE_CONTAINER="false"
fi

# Determine the IP the host should use to contact these docker containers
if [[ "$IS_OSX" == "true" ]]
then
    # OS X
    # This will be an empty string if docker-machine was not set up, but in that case it doesn't matter and we can't
    # detect it anyway
    WEBPACK_DEV_SERVER_HOST="$(echo $DOCKER_HOST | awk -F "/|:" '{ print $4 }')"
else
    if [[ "$INSIDE_CONTAINER" == "true" ]]
    then
        # Linux container
        WEBPACK_DEV_SERVER_HOST="$(ip route | grep default | awk '{ print $3 }')"
    else
        # Linux host
        CONTAINER_NAME="$(docker-compose ps -q watch)"
        WEBPACK_DEV_SERVER_HOST="$(docker exec "$CONTAINER_NAME" ip route | grep default | awk '{ print $3 }')"
    fi
fi

export IS_OSX="$IS_OSX"
export INSIDE_CONTAINER="$INSIDE_CONTAINER"
export WEBPACK_DEV_SERVER_HOST="$WEBPACK_DEV_SERVER_HOST"
