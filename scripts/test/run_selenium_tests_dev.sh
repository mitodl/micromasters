#!/usr/bin/env bash

# cd to root of repo
cd "$( dirname "${BASH_SOURCE[0]}" )"/../../
if [[ ! -e "webpack-stats.json" ]]
then
    echo "Please start the webpack dev server before running this script."
    exit 1
fi

source ./scripts/envs.sh
if [[ -z "$WEBPACK_SELENIUM_DEV_SERVER_HOST" ]]
then
    echo "WEBPACK_SELENIUM_DEV_SERVER_HOST is missing. Do you have docker-machine configured correctly?"
    exit 1
fi

# Start hub and chrome containers
docker-compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.selenium.yml up -d

# Run tests
docker-compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.selenium.yml run \
   -e USE_WEBPACK_DEV_SERVER=True \
   -e WEBPACK_DEV_SERVER_HOST="$WEBPACK_SELENIUM_DEV_SERVER_HOST" \
   selenium py.test ${@-./selenium_tests}
