#!/usr/bin/env bash

# cd to root of repo
cd "$( dirname "${BASH_SOURCE[0]}" )"/../../

if [[ ! -e "webpack-stats.json" ]]
then
    echo "Please start the webpack dev server before running this script."
    exit 1
fi

# TODO: can we detect this somehow?
if [[ -z "$WEBPACK_DEV_SERVER_HOST" ]]
then
    echo "Please set WEBPACK_DEV_SERVER_HOST to the IP address of your webpack dev server, omitting the port number."
    exit 1
fi

docker-compose run \
   -e DEBUG=False \
   -e DJANGO_LIVE_TEST_SERVER_ADDRESS=0.0.0.0:8286 \
   -e ELASTICSEARCH_INDEX=testindex \
   -e USE_WEBPACK_DEV_SERVER=True \
   -e WEBPACK_DEV_SERVER_HOST="$WEBPACK_DEV_SERVER_HOST" \
   selenium py.test ./selenium_tests/basic_test.py::BasicTests::test_zero_price_purchase
