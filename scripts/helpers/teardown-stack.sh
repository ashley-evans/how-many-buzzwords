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

echo "Deleting stack \"$stack\""

aws cloudformation delete-stack --stack-name $stack
aws cloudformation wait stack-delete-complete --stack-name $stack

echo "Emptying dependency bucket of templates related to stack: \"$stack\""

aws s3 rm "s3://buzzword-bucket/$stack" --recursive

echo "Deleting existing logs related to stack: \"$stack\""

log_groups=$(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/$stack" | jq -r '.logGroups[].logGroupName')

for log_group in $log_groups; do
    echo "Deleting log group \"$log_group\""
    aws logs delete-log-group --log-group-name $log_group
done
