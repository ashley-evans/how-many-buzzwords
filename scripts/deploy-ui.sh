#!/bin/bash

usage() {
    echo "Usage:
    -e [Environment to deploy]
    -f [Force deployment flag]
    -c [Cache build flag]" 1>&2;
    exit 1;
}

while getopts "e:fch" opt; do
    case $opt in
        e)
            environment=$OPTARG
            ;;
        f)
            force=true
            ;;
        c)
            cache=true
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

echo "Removing existing build artefacts..."
rm -rf "$root_dir/ui/dist"

echo "Building UI..."
npm --prefix "$root_dir/ui/" run build

template_path="$root_dir/ui/ui-template.yml"
if [ ! -f $template_path ]; then
    echo "Error: Cannot find template for UI at path: $template_path"
    exit 1
fi

config_path="$root_dir/ui/samconfig.toml"
if [ ! -f $config_path ]; then
    echo "Error: Cannot find UI config file at path: $config_path"
    exit 1
fi

build_optional_params=()
if [ $cache ]; then
    build_optional_params+=(-c)
fi

echo "Building UI stack..."
$script_dir/helpers/build-stack.sh \
    -t $template_path \
    "${build_optional_params[@]}"

deploy_optional_params=()
if [ $force ]; then
    deploy_optional_params+=(-f)
fi

echo "Deploying UI stack..."
$script_dir/helpers/deploy-stack.sh \
    -c $config_path \
    -e $environment \
    "${deploy_optional_params[@]}"

stack_name=$(node $script_dir/helpers/get-sam-config-value.js -c $config_path -e $environment -v stack_name)
deployment_bucket=$(aws cloudformation list-stack-resources --stack-name $stack_name \
    | jq -r '.StackResourceSummaries[] | select( .LogicalResourceId == "UIDeploymentBucket" ) | .PhysicalResourceId')

echo "Publishing built files to S3..."
aws s3 cp "$root_dir/ui/dist" "s3://$deployment_bucket" --recursive
