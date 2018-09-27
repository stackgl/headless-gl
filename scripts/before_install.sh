#!/usr/bin/env bash
set -o pipefail

if [[ ${TRAVIS_OS_NAME} == "osx" ]]; then
  brew install nvm
else
  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
fi
