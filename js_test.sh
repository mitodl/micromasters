#!/bin/bash
set -euf -o pipefail

node ./node_modules/mocha/bin/_mocha --compilers js:babel-register --require static/js/global_init.js ${1:-'static/**/*/*_test.js'}

