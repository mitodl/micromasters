#!/bin/bash

TMPFILE=$(mktemp)
fail() {
    echo "Error: one or more migrations are missing"
    echo
    cat "$TMPFILE"
    rm "$TMPFILE"
    exit 1
}

./manage.py makemigrations --no-input --dry-run >& "$TMPFILE"
if [[ $? ]]
then
    # makemigrations has returned a non-zero for some reason, possibly
    # because it needs input but --no-input is set
    fail;
elif cat "$TMPFILE" | grep -v "No changes detected" > /dev/null
then
    fail;
else
    rm "$TMPFILE"
fi
