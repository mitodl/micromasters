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
if [[ $? -ne 0 ]]
then
    # makemigrations has returned a non-zero for some reason, possibly
    # because it needs input but --no-input is set
    fail
elif [[ $(cat "$TMPFILE" | grep "No changes detected" | wc -l) -eq 0 ]]
then
    fail
else
    rm "$TMPFILE"
fi
