#!/bin/bash

TMPFILE=$(mktemp)
./manage.py migrate --no-input >& "$TMPFILE"
if cat "$TMPFILE" | grep "Your models have changes that are not yet reflected" > /dev/null
then
    echo "Error: one or more migrations are missing:"
    echo
    cat "$TMPFILE"
    rm "$TMPFILE"
    exit 1
else
    rm "$TMPFILE"
fi
