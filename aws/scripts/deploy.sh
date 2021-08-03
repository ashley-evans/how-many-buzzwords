#!/bin/bash

echo "Building Dependencies for Production"

rm -rf ../node_modules

npm --prefix ../ install --production

mkdir -p ../deployment_dependencies/nodejs/
cp -r ../node_modules/ ../deployment_dependencies/nodejs/node_modules/

echo "Deploying S3 Bucket for Lambda Code"

aws cloudformation deploy --template-file ../templates/lambda-bucket-template.yml --stack-name function-bucket-stack

echo "Packaging Buzzword Stack"

aws cloudformation package --template-file ../templates/buzzword-template.yml --s3-bucket buzzword-lambda-bucket --output-template-file ../templates/output-template.yml

rm -rf ../deployment_dependencies

echo "Deploying Buzzword Stack"

aws cloudformation deploy --template-file ../templates/output-template.yml --stack-name buzzword-stack --capabilities CAPABILITY_NAMED_IAM

echo "Restoring previous dependencies"

npm --prefix ../ install
