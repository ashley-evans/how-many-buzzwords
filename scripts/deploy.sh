#!/bin/bash

usage() { 
    echo "Usage: 
    -f [Force deployment without changeset check (Optional)] 
    -e [Name of SAM config environment] 
    --nocache [Force re-build of deployment files]" 1>&2; 
    exit 1; 
}

while getopts "fe:-:" opt; do
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

echo "Building Buzzword Stack"

npm --prefix $script_parent_dir run compile

if [ $nocache ]; then
    sam build --parallel --template-file "$script_parent_dir"/templates/buzzword-template.yml
else
    sam build --parallel --cached --template-file "$script_parent_dir"/templates/buzzword-template.yml
fi

echo "Deploying Buzzword Stack"

if [ $force ]; then
    sam deploy --config-file "$script_dir"/samconfig.toml --no-confirm-changeset --config-env $environment
else
    sam deploy --config-file "$script_dir"/samconfig.toml --config-env $environment
fi
