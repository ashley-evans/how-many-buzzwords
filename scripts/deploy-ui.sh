#!/bin/bash

usage() {
    echo "Usage:
    -e [Environment to deploy]
    -f [Force deployment flag]
    -d [Dry run flag]
    -c [Cache build flag]" 1>&2;
    exit 1;
}

while getopts "e:fdch" opt; do
    case $opt in
        e)
            environment=$OPTARG
            ;;
        f)
            force=true
            ;;
        d)
            dryrun=true
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

echo "Installing UI dependencies..."
npm --prefix "$root_dir/ui/" run ci

crawl_config_path="$root_dir/services/crawl/samconfig.toml"
if [ ! -f $crawl_config_path ]; then
    echo "Error: Cannot find crawl config file."
    exit 1
fi

crawl_stack_name=$(node $script_dir/helpers/get-sam-config-value.js -c $crawl_config_path -e $environment -v stack_name)

keyphrase_config_path="$root_dir/services/keyphrase/samconfig.toml"
if [ ! -f $crawl_config_path ]; then
    echo "Error: Cannot find keyphrase config file."
    exit 1
fi

keyphrase_stack_name=$(node $script_dir/helpers/get-sam-config-value.js -c $keyphrase_config_path -e $environment -v stack_name)

echo "Creating .env file for environment: $environment..."
$script_dir/helpers/generate-ui-env.sh -c $crawl_stack_name -k $keyphrase_stack_name -o $root_dir/ui/.env

if [ $? -ne 0 ]; then
    echo "Error: An error occured generating .env file for environment."
    exit 1
fi

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
if [ $dryrun ]; then
    deploy_optional_params+=(-d)
elif [ $force ]; then
    deploy_optional_params+=(-f)
fi

host_stack_outputs=$($script_dir/helpers/fetch-stack-outputs.sh -s buzzword-hosts -r us-east-1)
com_zone_id=$(echo $host_stack_outputs | jq -r 'select ( .OutputKey == "BuzzwordCOMHostedZoneID" ) | .OutputValue')
uk_zone_id=$(echo $host_stack_outputs | jq -r 'select ( .OutputKey == "BuzzwordUKHostedZoneID" ) | .OutputValue')
certificate_arn=$(echo $host_stack_outputs | jq -r 'select ( .OutputKey == "BuzzwordCertificateARN" ) | .OutputValue')

config_parameters=$(node $script_dir/helpers/get-sam-config-value.js -c $config_path -e $environment -v parameter_overrides)

echo "Deploying UI stack..."
$script_dir/helpers/deploy-stack.sh \
    -c $config_path \
    -e $environment \
    -o "BuzzwordCOMHostedZoneID=$com_zone_id BuzzwordUKHostedZoneID=$uk_zone_id BuzzwordCertificateARN=$certificate_arn $config_parameters" \
    "${deploy_optional_params[@]}"

if [ $? -ne 0 ]; then
    exit 1
fi

if ! [ $dryrun ]; then
    stack_name=$(node $script_dir/helpers/get-sam-config-value.js -c $config_path -e $environment -v stack_name)
    deployment_bucket=$(aws cloudformation list-stack-resources --stack-name $stack_name \
        | jq -r '.StackResourceSummaries[] | select( .LogicalResourceId == "UIDeploymentBucket" ) | .PhysicalResourceId')

    echo "Publishing built files to S3..."
    aws s3 cp "$root_dir/ui/dist" "s3://$deployment_bucket" --recursive
fi
