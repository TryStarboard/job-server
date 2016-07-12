#!/usr/bin/env bash

tsc -w &
nodemon -w src-js -w lib -w config -C -x 'node --harmony_destructuring --harmony_default_parameters src-js/index.js' &

wait
