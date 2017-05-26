#!/bin/bash
set -eo pipefail

docker build -t mitodl/mm_web_travis_next -f Dockerfile .
docker build -t mitodl/mm_watch_travis -f travis/Dockerfile-travis-watch-build .

docker push mitodl/mm_web_travis_next
docker push mitodl/mm_watch_travis
