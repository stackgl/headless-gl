#!/usr/bin/env bash

set -e
set -o pipefail

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
    source ./scripts/setup.sh
fi

source ~/.nvm/nvm.sh
nvm use ${NODE_VERSION}

npm test
