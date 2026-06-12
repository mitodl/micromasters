#!/bin/bash
set -e

export HOST_IP=$(netstat -nr | grep ^0\.0\.0\.0 | awk '{print $2}')

# Execute passed in arguments
$@
