#!/bin/bash

usage() { echo "Usage: -f [Force deployment without changeset check (Optional)] -e [Name of SAM config environment]" 1>&2; exit 1; }

while getopts "fe:" opt; do
    case $opt in
        f)
            force=true
            ;;
        e)
            environment=$OPTARG
            ;;
        \?)
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

echo "Building Buzzword Stack"

sam build --template-file "$script_parent_dir"/templates/buzzword-template.yml

echo "Deploying Buzzword Stack"

if [ $force ]; then
    sam deploy --config-file "$script_dir"/samconfig.toml --no-confirm-changeset --config-env $environment
else
    sam deploy --config-file "$script_dir"/samconfig.toml --config-env $environment
fi
