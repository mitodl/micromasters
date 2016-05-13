#!/usr/bin/env bash
set -euf -o pipefail
set -a

. ./_osx_setup.sh

$@
