#!/usr/bin/env bash

set -o pipefail

npm config delete prefix
if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  source ~/.nvm/nvm.sh
else
  source ~/.bashrc
fi

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  sh -e /etc/init.d/xvfb start
  glxinfo
fi

npm test
