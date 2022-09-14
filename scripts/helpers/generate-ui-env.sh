#!/bin/bash

usage() {
    echo "Usage:
    -c [Mandatory: Name of the crawl service stack to target]
    -k [Mandatory: Name of the keyphrase service stack to target]
    -r [The region the stacks reside in]" 1>&2;
    exit 1; 
}

while getopts "c:k:r:h" opt; do
    case $opt in
        c)
            crawl_stack=$OPTARG
            ;;
        k)
            keyphrase_stack=$OPTARG
            ;;
        r)
            region=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $crawl_stack ] || [ -z $keyphrase_stack ]; then
    usage 
fi

if [ -z $region]; then
    region="eu-west-2"
fi

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

crawl_stack_output=$($script_dir/fetch-stack-outputs.sh -s $crawl_stack -r $region)
crawl_graphql_endpoint=$(echo $crawl_stack_output | jq -r 'select ( .OutputKey == "CrawlGraphQLAPIEndpoint") | .OutputValue')

if [ -z $crawl_graphql_endpoint ]; then
    echo "Error: No Crawl GraphQL Endpoint found in crawl stack output."
    exit 1
fi

crawl_identity_pool_id=$(echo $crawl_stack_output | jq -r 'select ( .OutputKey == "CrawlIdentityPoolID") | .OutputValue')

if [ -z $crawl_identity_pool_id ]; then
    echo "Error: No Crawl Identity Pool ID found in crawl stack output."
    exit 1
fi

keyphrase_stack_output=$($script_dir/fetch-stack-outputs.sh -s $keyphrase_stack -r $region)
keyphrase_service_ws_endpoint=$(echo $keyphrase_stack_output | jq -r 'select ( .OutputKey == "WebSocketAPIEndpoint") | .OutputValue')

if [ -z $keyphrase_service_ws_endpoint ]; then
    echo "Error: No Keyphrase WebSocket Endpoint found in keyphrase stack output."
    exit 1
fi

echo "REGION=\"$region\"" > .env
echo "CRAWL_SERVICE_GRAPHQL_ENDPOINT=\"$crawl_graphql_endpoint\"" >> .env
echo "CRAWL_IDENTITY_POOL_ID=\"$crawl_identity_pool_id\"" >> .env
echo "KEYPHRASE_WS_SERVICE_ENDPOINT=\"$keyphrase_service_ws_endpoint/\$default\"" >> .env
