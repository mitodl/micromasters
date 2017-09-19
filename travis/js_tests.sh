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

run_test docker run --env-file .env -t travis-watch npm run codecov
run_test docker run --env-file .env -t travis-watch npm run lint
run_test docker run --env-file .env -t travis-watch npm run fmt:check
run_test docker run --env-file .env -t travis-watch npm run scss_lint
run_test docker run --env-file .env -t travis-watch npm run flow
run_test docker run --env-file .env -e "NODE_ENV=production" -t travis-watch ./webpack_if_prod.sh

exit $status
