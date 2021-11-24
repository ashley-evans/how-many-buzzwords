#!/bin/bash

curl -d "@test-invoke.json" -H "Content-Type: application/json" -X POST https://mo1mvz21g8.execute-api.eu-west-2.amazonaws.com/prod/crawl
