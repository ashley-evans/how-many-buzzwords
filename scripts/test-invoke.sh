#!/bin/bash

curl -d "@test-invoke.json" -H "Content-Type: application/json" -X POST https://0orfs9qhti.execute-api.eu-west-2.amazonaws.com/prod/crawl
