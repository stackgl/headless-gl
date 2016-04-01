#!/bin/bash

set -e
set -o pipefail

# Inspect binary.
if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
    ldd ./build/Release/webgl.node
else
    otool -L ./build/Release/webgl.node
fi

COMMIT_MESSAGE=$(git show -s --format=%B $TRAVIS_COMMIT | tr -d '\n')
PACKAGE_JSON_VERSION=$(node -e "console.log(require('./package.json').version)")

if [[ ${TRAVIS_TAG} == v${PACKAGE_JSON_VERSION} ]] || test "${COMMIT_MESSAGE#*'[publish binary]'}" != "$COMMIT_MESSAGE" && [[ ${COVERAGE} == false ]]; then
    source ~/.nvm/nvm.sh
    nvm use ${NODE_VERSION}

    npm install --compile --strip
    ./node_modules/.bin/prebuild --upload ${GITHUB_TOKEN}

    rm -rf build
    npm install --no-compile
    npm test
fi
