#!/bin/bash
set -eo pipefail

export NEXT=$(date | md5sum | cut -c -6)
export PROJECT_NAME="micromasters"
echo "Next hash is $NEXT"

export WEB_IMAGE=mitodl/${PROJECT_NAME}_web_travis_${NEXT}
export WATCH_IMAGE=mitodl/${PROJECT_NAME}_watch_travis_${NEXT}

docker build -t $WEB_IMAGE -f Dockerfile .
docker build -t $WATCH_IMAGE -f travis/Dockerfile-travis-watch-build .

docker push $WEB_IMAGE
docker push $WATCH_IMAGE

sed -r -i "s|^FROM mitodl.+$|FROM $WEB_IMAGE|" travis/Dockerfile-travis-web
sed -r -i "s|^FROM mitodl.+$|FROM $WATCH_IMAGE|" travis/Dockerfile-travis-watch
