#!/bin/bash
FILE=""
if [[ "$1" != "" ]]
then
    FILE=$(find -name "$1")

    if [[ "$FILE" == "" ]]
    then
        echo "Unable to find file with pattern $1"
        exit 1
    fi

    echo "Running ./js_test.sh $FILE"
fi

./js_test.sh $FILE
