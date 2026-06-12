#!/bin/bash

TMPFILE=$(mktemp)
fail() {
	echo "Error: migrations with generated names exist"
	echo
	cat "$TMPFILE"
	rm "$TMPFILE"
	exit 1
}

# search for auto migrations excluded the preexisting one
find */migrations/*_auto_*.py | grep -v "20170113_2133" >"$TMPFILE"

if [[ $(cat "$TMPFILE" | wc -l) -ne 0 ]]; then
	fail
else
	rm "$TMPFILE"
fi
