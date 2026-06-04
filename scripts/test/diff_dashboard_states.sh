#!/bin/bash
#
# Requirements:
# - Imagemagick installed with PNG support locally

BRANCH1=$(git rev-parse --abbrev-ref HEAD)
BRANCH2=$1

shift 1

# verify the branch exists
if ! git rev-parse --verify $BRANCH2 >/dev/null; then
	echo "$BRANCH2 is not a valid branch"
	exit 1
fi

if ! type "magick" >/dev/null; then
	echo "ImageMagick is not installed"
	exit 1
fi

set -e -o pipefail

OUT1="output/dashboard_states_current"
OUT2="output/dashboard_states_other"
DIFFOUT="output/dashboard_states_diff"

mkdir -p output
chmod o+w output # need to be able to write to this as the docker user

./scripts/test/run_snapshot_dashboard_states.sh --output "$OUT1" $@

git fetch
git checkout "$BRANCH2"

./scripts/test/run_snapshot_dashboard_states.sh --output "$OUT2" $@

git checkout "$BRANCH1"

mkdir -p "$DIFFOUT"

set +e # imagemagick returns nonzero codes, so ignore them

for f1 in $OUT1/*.png; do
	fname=$(basename $f1)
	echo "Diffing: $fname"
	magick compare "$OUT1/$fname" "$OUT2/$fname" "$DIFFOUT/$fname"
done

# imagemagick returns 1
exit 0
