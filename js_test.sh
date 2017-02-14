#!/bin/bash
export TMP_FILE=$(mktemp)

if [[ ! -z "$COVERAGE" ]]
then
    export CMD="node ./node_modules/istanbul/lib/cli.js cover ./node_modules/mocha/bin/_mocha --"
elif [[ ! -z "$CODECOV" ]]
then
    export CMD="node ./node_modules/istanbul/lib/cli.js cover ./node_modules/mocha/bin/_mocha -- --report lcovonly -R spec"
else
    export CMD="node ./node_modules/mocha/bin/_mocha"
fi

export FILES=${1:-'static/**/*/*_test.js'}

$CMD --require static/js/babelhook.js static/js/global_init.js "$FILES" 2> >(tee "$TMP_FILE")
export TEST_RESULT=$?
export TRAVIS_BUILD_DIR=$PWD
if [[ ! -z "$CODECOV" ]]
then
    echo "Uploading coverage..."
    node ./node_modules/codecov/bin/codecov
fi

if [[ $TEST_RESULT -ne 0 ]]
then
    echo "Tests failed, exiting with error $TEST_RESULT..."
    rm -f "$TMP_FILE"
    exit 1
fi

if [[ $(
    cat "$TMP_FILE" |
    grep -v 'ignored, nothing could be mapped' |
    grep -v 'You are manually calling a React.PropTypes validation function' |
    grep -v 'React.__spread is deprecated' |
    wc -l |
    awk '{print $1}'
    ) -ne 0 ]]  # is file empty?
then
    echo "Error output found, see test output logs to see which test they came from."
    rm -f "$TMP_FILE"
    exit 1
fi

rm -f "$TMP_FILE"
