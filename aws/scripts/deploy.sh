#!/bin/bash

echo "Deploying S3 Bucket for Buzzword Stack Dependencies"

aws cloudformation deploy --template-file ../templates/buzzword-bucket-template.yml --stack-name buzzword-bucket-stack

echo "Building Buzzword Stack"

sam build --template-file ../templates/buzzword-template.yml

echo "Deploying Buzzword Stack"

sam deploy --config-file ./samconfig.toml
