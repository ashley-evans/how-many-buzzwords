#!/bin/bash

crawl_stack="buzzword-crawl-service-dev"
keyphrase_stack="buzzword-keyphrase-service-dev"
region="eu-west-2"

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "REGION=\"$region\"" > .env

crawl_stack_output=$($script_dir/fetch-stack-outputs.sh -s $crawl_stack -r $region)

crawl_graphql_endpoint=$(echo $crawl_stack_output | jq -r 'select ( .OutputKey == "CrawlGraphQLAPIEndpoint") | .OutputValue')

echo "CRAWL_SERVICE_GRAPHQL_ENDPOINT=\"$crawl_graphql_endpoint\"" >> .env

crawl_identity_pool_id=$(echo $crawl_stack_output | jq -r 'select ( .OutputKey == "CrawlIdentityPoolID") | .OutputValue')

echo "CRAWL_IDENTITY_POOL_ID=\"$crawl_identity_pool_id\"" >> .env

keyphrase_stack_output=$($script_dir/fetch-stack-outputs.sh -s $keyphrase_stack -r $region)

keyphrase_service_ws_endpoint=$(echo $keyphrase_stack_output | jq -r 'select ( .OutputKey == "WebSocketAPIEndpoint") | .OutputValue')

echo "KEYPHRASE_WS_SERVICE_ENDPOINT=\"$keyphrase_service_ws_endpoint/\$default\"" >> .env
