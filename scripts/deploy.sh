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

$script_dir/deploy-dependency-bucket.sh

if [ $? -ne 0 ]; then
    exit 1
fi

$script_dir/deploy-host-stack.sh

if [ $? -ne 0 ]; then
    exit 1
fi

echo "Deploying Crawl Service"

$script_dir/deploy-crawl-service.sh -e $environment

if [ $? -ne 0 ]; then
    exit 1
fi

echo "Deploying Keyphrase Service"

$script_dir/deploy-keyphrase-service.sh -e $environment

if [ $? -ne 0 ]; then
    exit 1
fi

echo "Deploying UI"

$script_dir/deploy-ui.sh -e $environment -f -c
