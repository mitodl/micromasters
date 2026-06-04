#!/bin/bash
set -ef -o pipefail
if [[ $NODE_ENV != "" && $NODE_ENV != "development" ]]; then
	node node_modules/webpack/bin/webpack.js --config webpack.config.prod.js --bail
fi
