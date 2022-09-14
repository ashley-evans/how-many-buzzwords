crawl_stack="buzzword-crawl-service-dev"

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

crawl_stack_output=$($script_dir/fetch-stack-outputs.sh -s $crawl_stack)

crawl_graphql_endpoint=$(echo $crawl_stack_output | jq -r 'select ( .OutputKey == "CrawlGraphQLAPIEndpoint") | .OutputValue')

echo "CRAWL_SERVICE_GRAPHQL_ENDPOINT=\"$crawl_graphql_endpoint\"" > .env

crawl_identity_pool_id=$(echo $crawl_stack_output | jq -r 'select ( .OutputKey == "CrawlIdentityPoolID") | .OutputValue')

echo "CRAWL_IDENTITY_POOL_ID=\"$crawl_identity_pool_id\"" >> .env
