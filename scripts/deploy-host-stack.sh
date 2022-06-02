#!/bin/bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="$( dirname "$script_dir")"

echo "Deploying stack with host and certificate configuration..."

aws --region us-east-1 cloudformation deploy \
    --template-file "$root_dir"/templates/buzzword-host-template.yml \
    --stack-name buzzword-hosts \
