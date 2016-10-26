#!/bin/bash
set -e -o pipefail

if ./manage.py migrate --fake --no-input | grep "Your models have changes that are not yet reflected" > /dev/null
then
    echo "Error: one or more migrations are missing:"
    echo
    ./manage.py migrate --fake --no-input
    exit 1
fi
