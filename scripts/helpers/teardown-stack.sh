#!/bin/bash

usage() {
    echo "Usage:
    -s [Name of Buzzword Stack to be deleted]" 1>&2;
    exit 1; 
}

while getopts "s:h" opt; do
    case $opt in
        s)
            stack=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $stack ]; then
    usage
fi

if ! aws cloudformation describe-stacks --stack-name $stack &>/dev/null ; then
    echo "Error: Stack \"$stack\" does not exist" >&2
    exit 1
fi

stack_lambda_layers=$(aws cloudformation list-stack-resources --stack-name $stack \
    | jq -r '.StackResourceSummaries[] | select( .ResourceType == "AWS::Lambda::LayerVersion") | .PhysicalResourceId')

echo "Deleting stack: \"$stack\""

aws cloudformation delete-stack --stack-name $stack
aws cloudformation wait stack-delete-complete --stack-name $stack

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "Deleting layers associated with stack: \"$stack\""

for layer_arn in $stack_lambda_layers; do
    layer_name=$( echo $layer_arn | awk -F: '{print $(--NF)}')
    $script_dir/delete-all-lambda-layer-versions.sh -l $layer_name
done

echo "Emptying dependency bucket of templates related to stack: \"$stack\""

aws s3 rm "s3://buzzword-bucket/$stack" --recursive

echo "Deleting existing logs related to stack: \"$stack\""

log_groups=$(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/$stack" | jq -r '.logGroups[].logGroupName')

for log_group in $log_groups; do
    echo "Deleting log group \"$log_group\""
    aws logs delete-log-group --log-group-name $log_group
done
