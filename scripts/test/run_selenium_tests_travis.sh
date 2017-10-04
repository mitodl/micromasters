#!/usr/bin/env bash

# cd to root of repo
cd "$( dirname "${BASH_SOURCE[0]}" )"/../../

if [[ ! -e "webpack-stats.json" ]]
then
    echo "webpack-stats.json must exist before running the selenium tests. Run webpack to create it."
    exit 1
fi
docker-compose -f travis-docker-compose.yml run \
   -e DEBUG=False \
   -e DJANGO_LIVE_TEST_SERVER_ADDRESS=0.0.0.0:7000-8000 \
   -e ELASTICSEARCH_INDEX=testindex \
   -e ELASTICSEARCH_DEFAULT_PAGE_SIZE=5 \
   -e MAILGUN_URL=http://fake.mailgun.url \
   -e MAILGUN_KEY=fake_mailgun_key \
   selenium py.test ./selenium_tests
