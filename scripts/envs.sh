#!/usr/bin/env bash
set -e -o pipefail

# If we're running from inside a container /.dockerenv should exist (not a guarantee but the best we can do)
if [[ -e "/.dockerenv" ]]
then
  INSIDE_CONTAINER="true"
else
  INSIDE_CONTAINER="false"
fi

# Set WEBPACK_DEV_SERVER_HOST to the IP or hostname which the browser will use to contact the webpack dev server
WEBPACK_DEV_SERVER_HOST="localhost"

# Set WEBPACK_SELENIUM_DEV_SERVER_HOST to the IP address for the webpack dev server
# This is different from WEBPACK_DEV_SERVER_HOST because localhost won't suffice here since the request
# is coming from a docker container, not the browser. If we can't detect this the user must set it via a script.
if [[ "$INSIDE_CONTAINER" == "true" ]]
then
    # Linux container
    WEBPACK_SELENIUM_DEV_SERVER_HOST="$(ip route | grep default | awk '{ print $3 }')"
else
    # Linux host
    CONTAINER_NAME="$(docker-compose ps -q watch)"
    if [[ -z "$CONTAINER_NAME" ]]
    then
        echo "Missing container watch"
        exit 1
    fi

    CONTAINER_STATUS="$(docker inspect "$CONTAINER_NAME" -f '{{.State.Status}}')"
    if [[ "$CONTAINER_STATUS" != "running" ]]
    then
        echo "watch container status for $CONTAINER_NAME was expected to be running but is $CONTAINER_STATUS"
        exit 1
    fi

    WEBPACK_SELENIUM_DEV_SERVER_HOST="$(docker exec "$CONTAINER_NAME" ip route | grep default | awk '{ print $3 }')"
fi

export INSIDE_CONTAINER="$INSIDE_CONTAINER"
export WEBPACK_DEV_SERVER_HOST="$WEBPACK_DEV_SERVER_HOST"
export WEBPACK_SELENIUM_DEV_SERVER_HOST="$WEBPACK_SELENIUM_DEV_SERVER_HOST"

echo "Vars set:"
echo INSIDE_CONTAINER="$INSIDE_CONTAINER"
echo WEBPACK_DEV_SERVER_HOST="$WEBPACK_DEV_SERVER_HOST"
echo WEBPACK_SELENIUM_DEV_SERVER_HOST="$WEBPACK_SELENIUM_DEV_SERVER_HOST"
