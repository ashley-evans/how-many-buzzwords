#!/bin/bash

usage() { 
    echo "Usage: 
    -f [Force deployment without changeset check (Optional)] 
    -e [Name of SAM config environment] 
    --nocache [Force re-build of deployment files]" 1>&2; 
    exit 1; 
}

build() {
    if [ $nocache ]; then
        sam build --parallel --template-file $1
    else
        sam build --parallel --cached --template-file $1
    fi
}

deploy() {
    if [ $force ]; then
        if [[ -z $2 ]]; then
            sam deploy --config-file $1 --no-confirm-changeset --config-env $environment
        else
            sam deploy --config-file $1 --no-confirm-changeset --config-env $environment --parameter-overrides $2
        fi
    else
        if [[ -z $2 ]]; then
            sam deploy --config-file $1 --config-env $environment
        else
            sam deploy --config-file $1 --config-env $environment --parameter-overrides $2
        fi
    fi
}

while getopts "fe:-:h" opt; do
    if [ $opt = "-" ]; then
        opt="${OPTARG%%=*}"
        OPTARG="${OPTARG#$opt}"
        OPTARG="${OPTARG#=}"
    fi

    case $opt in
        f)
            force=true
            ;;
        e)
            environment=$OPTARG
            ;;
        nocache)
            nocache=true
            ;;
        h)
            usage
            ;;
        ??*)
            echo "${BASH_SOURCE[0]}: illegal option: -- $opt"
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
script_parent_dir="$( dirname "$script_dir")"

echo "Deploying S3 Bucket for Buzzword Stack Dependencies"

aws cloudformation deploy --template-file "$script_parent_dir"/templates/buzzword-bucket-template.yml --stack-name buzzword-bucket-stack

echo "Building source code"

# npm --prefix $script_parent_dir run compile:clean

echo "Building Crawl Service"

build $script_parent_dir/services/crawl/crawl-template.yml

echo "Deploying Crawl Service"

crawl_config="$script_parent_dir/services/crawl/samconfig.toml"
deploy $crawl_config

crawl_stack_name=$(node $script_dir/get-sam-config-value.js -c $crawl_config -e $environment -v stack_name)

if [ $? -ne 0 ]; then
    echo "Error: An error occured while obtaining the stack name."
    exit 1
fi

crawl_topic_arn=$($script_dir/fetch-stack-outputs.sh -s $crawl_stack_name | jq -r .OutputValue)

if [ -z $crawl_topic_arn ]; then
    echo "Error: No Crawl SNS Topic found."
    exit 1
fi

echo "Building Buzzword Stack"

build $script_parent_dir/templates/buzzword-template.yml

echo "Deploying Buzzword Stack"

config_parameters=$(node $script_dir/get-sam-config-value.js -c $crawl_config -e $environment -v parameter_overrides)

if [ $? -ne 0 ]; then
    echo "Error: An error occured while obtaining the stack config's parameter overrides."
    exit 1
fi

deploy $script_dir/samconfig.toml "CrawlTopicARN=$crawl_topic_arn $config_parameters"
