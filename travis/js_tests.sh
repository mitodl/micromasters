#!/bin/bash

status=0

function run_test {
    "$@"
    local test_status=$?
    if [ $test_status -ne 0 ]; then
        status=$test_status
    fi
    return $status
}

run_test npm run codecov
run_test npm run lint
run_test npm run fmt:check
run_test npm run scss_lint
run_test npm run flow
run_test node node_modules/webpack/bin/webpack.js --config webpack.config.prod.js --bail

exit $status
