#!/usr/bin/env bash

set -o pipefail

npm config delete prefix
if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  source ~/.nvm/nvm.sh
else
  source ~/.bashrc
fi

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  xvfb-run --auto-servernum --server-num=1 -s "-ac -screen 0 1280x1024x24" `which glxinfo`
  xvfb-run --auto-servernum --server-num=1 -s "-ac -screen 0 1280x1024x24" `which npm` test
else
  npm test
fi
