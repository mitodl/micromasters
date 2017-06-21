#!/usr/bin/env bash
set -e -o pipefail

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

docker-compose run \
   -e RUNNING_SELENIUM=true \
   -e WEBPACK_DEV_SERVER_HOST="$WEBPACK_SELENIUM_DEV_SERVER_HOST" \
   selenium ./manage.py snapshot_dashboard_states $@
