#!/usr/bin/env bash

# cd to root of repo
cd "$( dirname "${BASH_SOURCE[0]}" )"/../../

if [[ ! -e "webpack-stats.json" ]]
then
    echo "webpack-stats.json must exist before running the selenium tests. Run webpack to create it."
    exit 1
fi
docker-compose -f docker-compose.yml -f docker-compose.travis.yml -f docker-compose.selenium.yml run \
   selenium py.test ./selenium_tests
