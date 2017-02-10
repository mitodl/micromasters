#!/usr/bin/env bash

# cd to root of repo
cd "$( dirname "${BASH_SOURCE[0]}" )"/../../

if [[ ! -e "webpack-stats.json" ]]
then
    echo "webpack-stats.json must exist before running the selenium tests. Run webpack to create it."
    exit 1
fi
docker-compose run -e DEBUG=False -e DJANGO_LIVE_TEST_SERVER_ADDRESS=0.0.0.0:8286 web py.test ./selenium_tests
