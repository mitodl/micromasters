#!/bin/bash
set -e -o pipefail

if [[ ! -z "$TRAVIS_COMMIT" ]]
then
    echo "Uploading coverage..."
    export TRAVIS_BUILD_DIR=$PWD
    cp /tmp/coverage .
    codecov -e TOXENV
fi
