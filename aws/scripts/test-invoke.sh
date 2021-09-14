#!/bin/bash

curl -d "@test-invoke.json" -H "Content-Type: application/json" -X POST https://kpcjcra6kh.execute-api.eu-west-2.amazonaws.com/prod/crawl
