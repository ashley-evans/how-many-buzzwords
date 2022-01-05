#!/bin/bash

usage() {
    echo "Usage:
    -e [Environment to deploy]" 1>&2;
    exit 1;
}

findoutputvalue() {
    value=$(echo $stack_outputs | jq -r ". | select( .OutputKey == \"$1\") | .OutputValue")

    if [ -z $value ]; then
        echo "Error: Key: \"$2\" not found in stack outputs." >&2
        exit 1;
    fi

    echo "$value"
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

template_path="$root_dir/templates/buzzword-template.yml"
if [ ! -f $template_path ]; then
    echo "Error: Cannot find buzzword stack template."
    exit 1
fi

config_path="$root_dir/templates/samconfig.toml"
if [ ! -f $config_path ]; then
    echo "Error: Cannot find buzzword stack config file."
    exit 1
fi

keyphrase_config_path="$root_dir/services/keyphrase/samconfig.toml"
if [ ! -f $crawl_config_path ]; then
    echo "Error: Cannot find keyphrase service config file."
    exit 1
fi

keyphrase_stack_name=$(node $script_dir/helpers/get-sam-config-value.js -c $keyphrase_config_path -e $environment -v stack_name)

if [ $? -ne 0 ]; then
    echo "Error: An error occured while obtaining the crawl stack name."
    exit 1
fi

stack_outputs=$($script_dir/helpers/fetch-stack-outputs.sh -s $keyphrase_stack_name)

if [[ -z $stack_outputs ]]; then
    echo "Error: No keyphrase service stack outputs found."
    exit 1;
fi

keyphrase_table_name=$(findoutputvalue TableName)
keyphrase_table_arn=$(findoutputvalue TableArn)
keyphrase_table_stream_arn=$(findoutputvalue TableStreamArn)

overrides="SocketTableName=$keyphrase_table_name SocketTableARN=$keyphrase_table_arn SocketTableStreamARN=$keyphrase_table_stream_arn"

config_parameters=$(node $script_dir/helpers/get-sam-config-value.js -c $config_path -e $environment -v parameter_overrides)

$script_dir/helpers/deploy-service.sh \
    -t $template_path \
    -c $config_path \
    -e $environment \
    -f \
    -o "$overrides $config_parameters" \
    --cache
