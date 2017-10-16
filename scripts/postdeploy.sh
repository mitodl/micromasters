#!/usr/bin/env bash
set -eo pipefail

echo "Running migrations..."
./manage.py migrate --noinput

echo "Checking if app is a review app..."
if [[ ! -z "$HEROKU_PARENT_APP_NAME" ]]
then
    echo "App is a review app: ${HEROKU_APP_NAME}"
    # Review app, we need to tweak the Elasticsearch index a bit
    NEW_INDEX="${ELASTICSEARCH_INDEX}-${HEROKU_APP_NAME}"

    # Patch environment variable for this PR build
    echo "Updating ELASTICSEARCH_INDEX to $NEW_INDEX"
    curl -n -X PATCH https://api.heroku.com/apps/"$HEROKU_APP_NAME"/config-vars/ \
        -d "{\"ELASTICSEARCH_INDEX\": \"$NEW_INDEX\"}" \
        -H "Content-Type: application/json" \
        -H "Accept: application/vnd.heroku+json; version=3" --fail

    # Set up the index
    ELASTICSEARCH_INDEX=$NEW_INDEX ./manage.py recreate_index
else
    echo "App is not a review app"
fi

echo "Done with postdeploy"
