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

docker-compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.selenium.yml run \
   -e DEBUG=False \
   -e DJANGO_LIVE_TEST_SERVER_ADDRESS=0.0.0.0:7000-8000 \
   -e ELASTICSEARCH_INDEX=testindex \
   -e USE_WEBPACK_DEV_SERVER=True \
   -e WEBPACK_DEV_SERVER_HOST="$WEBPACK_SELENIUM_DEV_SERVER_HOST" \
   -e ELASTICSEARCH_DEFAULT_PAGE_SIZE=5 \
   -e MAILGUN_URL=http://fake.mailgun.url \
   -e MAILGUN_KEY=fake_mailgun_key \
   selenium py.test ${@-./selenium_tests}
