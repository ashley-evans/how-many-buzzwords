#!/bin/bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="$( dirname "$script_dir")"

echo "Deploying S3 Bucket for all stack dependencies"

aws cloudformation deploy --template-file "$root_dir"/templates/buzzword-bucket-template.yml --stack-name buzzword-bucket-stack
