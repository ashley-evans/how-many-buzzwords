#!/bin/bash

echo "Deleting Buzzword Stack"

aws cloudformation delete-stack --stack-name buzzword-stack
aws cloudformation wait stack-delete-complete --stack-name buzzword-stack

echo "Emptying Buzzword Bucket before deletion"

aws s3 rm s3://buzzword-bucket --recursive

echo "Deleting Buzzword Bucket Stack"

aws cloudformation delete-stack --stack-name buzzword-bucket-stack
aws cloudformation wait stack-delete-complete --stack-name buzzword-bucket-stack

echo "Deleting existing logs"

aws logs describe-log-groups --log-group-name-prefix /aws/lambda/buzzword-stack-WibbleLambda | jq -r '.logGroups[].logGroupName' | while read logGroupName; do
    echo "Deleting log group: ${logGroupName}"
    aws logs delete-log-group --log-group-name $logGroupName
done
