#!/usr/bin/env bash
set -e -o pipefail

# Set IS_OSX to true or false depending on which environment we're running in
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
if [[ "$IS_OSX" == "true" ]]
then
    if [[ "$INSIDE_CONTAINER" == "true" ]]
    then
        if [[ "$CONTAINER_NAME" != "watch" ]]
        then
            # This should be already defined and passed in via script. If not, we should error.
            if [[ -z "$WEBPACK_SELENIUM_DEV_SERVER_HOST" ]]
            then
                echo "WEBPACK_SELENIUM_DEV_SERVER_HOST is undefined. Did you run the management command from a script?"
                exit 1
            fi
        fi
        # Else webpack_dev_server.sh should handle the exit message
    else
        if [[ -z "$DOCKER_HOST" ]]
        then
            # If we're running the webpack dev server we don't need this
            WEBPACK_SELENIUM_DEV_SERVER_HOST=""
        else
            # This is kind of kludgy. The DOCKER_HOST ip address is usually something like 192.168.99.100.
            # We can access the webpack dev server running on the host by using the gateway IP for this subnet,
            # 192.168.99.1. To get it we need to look up the interface for the DOCKER_HOST ip, then look up
            # the gateway IP address for that interface.
            DOCKER_HOST_IP="$(echo "$DOCKER_HOST" | awk -F'/|:' '{print $4}' )"
            VBOXNET_INTERFACE="$(arp -an | grep "$DOCKER_HOST_IP" | awk -F'on' '{print $2}' | awk '{print $1}')"
            WEBPACK_SELENIUM_DEV_SERVER_HOST="$(ifconfig "$VBOXNET_INTERFACE" | grep inet | awk '{print $2}')"
        fi
    fi
else
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
fi

export IS_OSX="$IS_OSX"
export INSIDE_CONTAINER="$INSIDE_CONTAINER"
export WEBPACK_DEV_SERVER_HOST="$WEBPACK_DEV_SERVER_HOST"
export WEBPACK_SELENIUM_DEV_SERVER_HOST="$WEBPACK_SELENIUM_DEV_SERVER_HOST"

echo "Vars set:"
echo IS_OSX="$IS_OSX"
echo INSIDE_CONTAINER="$INSIDE_CONTAINER"
echo WEBPACK_DEV_SERVER_HOST="$WEBPACK_DEV_SERVER_HOST"
echo WEBPACK_SELENIUM_DEV_SERVER_HOST="$WEBPACK_SELENIUM_DEV_SERVER_HOST"
