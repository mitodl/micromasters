#!/bin/bash
set -euf -o pipefail

export TMP_FILE=$(mktemp)
node ./node_modules/mocha/bin/_mocha --compilers js:babel-register static/js/global_init.js ${1:-'static/**/*/*_test.js'} 2> >(tee "$TMP_FILE")

if [[ -s "$TMP_FILE" ]]  # is file empty?
then
    echo "Error output found, see test output logs to see which test they came from."
    rm -f "$TMP_FILE"
    exit 1
fi

rm -f "$TMP_FILE"
