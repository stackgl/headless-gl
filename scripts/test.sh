#!/usr/bin/env bash

set -o pipefail

npm config delete prefix
if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  source ~/.nvm/nvm.sh
else
  source ~/.bashrc
fi

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  sudo /sbin/start-stop-daemon --start --quiet --pidfile /tmp/custom_xvfb_99.pid --make-pidfile --background --exec /usr/bin/Xvfb -- :99 -ac -screen 0 1280x1024x24
  sudo glxinfo
fi

npm test
