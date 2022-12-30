#!/bin/bash

usage() {
    echo "Usage:
    -e [Environment to deploy]
    -d [Dry run flag]" 1>&2;
    exit 1;
}

while getopts "e:dh" opt; do
    case $opt in
        e)
            environment=$OPTARG
            ;;
        d)
            dryrun=true
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

$script_dir/helpers/compile-service.sh -c -p $root_dir/services/crawl

if [ $? -ne 0 ]; then
    exit 1
fi

template_path="$root_dir/dist/crawl-template.yml"
if [ ! -f $template_path ]; then
    echo "Error: Cannot find template in built files."
    exit 1
fi

config_path="$root_dir/services/crawl/samconfig.toml"
if [ ! -f $config_path ]; then
    echo "Error: Cannot find crawl config file."
    exit 1
fi

config_parameters=$(node $script_dir/helpers/get-sam-config-value.js -c $config_path -e $environment -v parameter_overrides)

if [ $? -ne 0 ]; then
    echo "Error: An error occured while obtaining the crawl service config parameter overrides."
    exit 1
fi

api_key_expiry="$(date -d "+365 days" "+%s")"

deploy_optional_params=()
if [ $dryrun ]; then
    deploy_optional_params+=(-d)
else
    deploy_optional_params+=(-f)
fi

$script_dir/helpers/deploy-service.sh \
    -t $template_path \
    -c $config_path \
    -e $environment \
    -o "APIKeyExpiryTime=$api_key_expiry $config_parameters" \
    --cache \
    "${deploy_optional_params[@]}"
