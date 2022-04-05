#!/bin/bash

APP_NAME="$1"

if [ -z $APP_NAME ]
then
    echo "Usage: bin/build_heroku_pipeline.sh some-app-name"
    exit 1
fi

if [ -z `which heroku` ]
then
   echo "You need to install the Heroku CLI for this script to work. https://devcenter.heroku.com/articles/heroku-cli"
   exit 1
fi

if [ -z `which jq` ]
then
    echo "You need to install the 'jq' command line tool for this script to work. https://stedolan.github.io/jq/"
    exit 1
fi

if [ ! -f 'app.json' ]
then
    echo "Could not find the 'app.json' file. Either change to the directory where it exists or create one. https://devcenter.heroku.com/articles/app-json-schema "
    exit 1
fi

for suffix in '-ci' '-rc' ''
do
    heroku apps:create $APP_NAME$suffix

    for addon_ in `jq '.addons | .[]' app.json`
    do
        heroku addons:add ${addon_//\"} -a $APP_NAME$suffix
    done

    for buildpack_ in `jq ".buildpacks | .[] | .url" app.json`
    do
        heroku buildpacks:add ${buildpack_//\"} -a $APP_NAME$suffix
    done
done

heroku pipelines:create $APP_NAME -a $APP_NAME-ci -s development
heroku pipelines:add $APP_NAME -a $APP_NAME-rc -s staging
heroku pipelines:add $APP_NAME -a $APP_NAME -s production
