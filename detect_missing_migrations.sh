#!/bin/bash

TMPFILE=$(mktemp)
./manage.py makemigrations --no-input --dry-run >& "$TMPFILE"
if cat "$TMPFILE" | grep -v "No changes detected" > /dev/null
then
    echo "Error: one or more migrations are missing:"
    echo
    cat "$TMPFILE"
    rm "$TMPFILE"
    exit 1
else
    rm "$TMPFILE"
fi
