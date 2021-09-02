#!/bin/bash

usage() { echo "Usage: -s [Name of Buzzword Stack to be deleted]" 1>&2; exit 1; }

while getopts "s:" opt; do
    case $opt in
        s)
            stack=$OPTARG
            ;;
        \?)
            usage
            ;;
    esac
done

if [ -z $stack ]; then
    stack="buzzword-stack-dev"
fi

if ! aws cloudformation describe-stacks --stack-name $stack &>/dev/null ; then
    echo "Stack: \"$stack\" does not exist" >&2
    exit 1
fi

echo "Deleting stack ($stack)"

aws cloudformation delete-stack --stack-name $stack
aws cloudformation wait stack-delete-complete --stack-name $stack

echo "Emptying Buzzword Bucket of templates related to stack ($stack)"

aws s3 rm "s3://buzzword-bucket/$stack" --recursive

echo "Deleting existing logs related to stack ($stack)"

aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/$stack-WibbleLambda" | jq -r ".logGroups[].logGroupName" | while read logGroupName; do
    echo "Deleting log group: ${logGroupName}"
    aws logs delete-log-group --log-group-name $logGroupName
done
