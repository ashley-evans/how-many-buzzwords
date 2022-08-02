#!/bin/bash

usage() {
    echo "Usage:
    -e [Environment to deploy]" 1>&2;
    exit 1;
}

while getopts "e:h" opt; do
    case $opt in
        e)
            environment=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $environment ]; then
    environment="default"
fi

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="$( dirname "$script_dir")"

$script_dir/helpers/compile-service.sh -c -p $root_dir/services/keyphrase

if [ $? -ne 0 ]; then
    exit 1
fi

template_path="$root_dir/dist/keyphrase-template.yml"
if [ ! -f $template_path ]; then
    echo "Error: Cannot find template in built files."
    exit 1
fi

config_path="$root_dir/services/keyphrase/samconfig.toml"
if [ ! -f $config_path ]; then
    echo "Error: Cannot find keyphrase config file."
    exit 1
fi

crawl_config_path="$root_dir/services/crawl/samconfig.toml"
if [ ! -f $crawl_config_path ]; then
    echo "Error: Cannot find crawl config file."
    exit 1
fi

crawl_stack_name=$(node $script_dir/helpers/get-sam-config-value.js -c $crawl_config_path -e $environment -v stack_name)

if [ $? -ne 0 ]; then
    echo "Error: An error occured while obtaining the crawl stack name."
    exit 1
fi

stack_outputs=$($script_dir/helpers/fetch-stack-outputs.sh -s $crawl_stack_name)
crawl_event_bus_arn=$(echo $stack_outputs | jq -r 'select ( .OutputKey == "EventBusARN" ) | .OutputValue')

if [ -z $crawl_event_bus_arn ]; then
    echo "Error: No Crawl Event Bus ARN found."
    exit 1
fi

crawl_rest_endpoint=$(echo $stack_outputs | jq -r 'select ( .OutputKey == "CrawlRESTAPIEndpoint" ) | .OutputValue')

if [ -z $crawl_rest_endpoint ]; then
    echo "Error: No Crawl REST Endpoint found."
    exit 1
fi

config_parameters=$(node $script_dir/helpers/get-sam-config-value.js -c $config_path -e $environment -v parameter_overrides)

if [ $? -ne 0 ]; then
    echo "Error: An error occured while obtaining the keyphrase service config parameter overrides."
    exit 1
fi

$script_dir/helpers/deploy-service.sh \
    -t $template_path \
    -c $config_path \
    -e $environment \
    -f \
    -o "CrawlEventBusARN=$crawl_event_bus_arn CrawlRESTEndpoint=$crawl_rest_endpoint $config_parameters" \
    --cache
