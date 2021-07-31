# how-many-buzzwords
Some buzzwords are incredibly overused, a simple tool tool to find the biggest culprits

## Setup

In order to setup this application from scratch the AWS CLI (Version 2.x) must be installed onto your machine. See the AWS documentation here for more information:
- https://aws.amazon.com/cli/

Once the CLI has been installed, then run the following commands:
```shell
aws cloudformation deploy --template-file ./aws/templates/lambda-bucket-template.yml --stack-name function-bucket-stack

aws cloudformation package --template-file ./aws/templates/buzzword-template.yml --s3-bucket buzzword-lambda-bucket --output-template-file ./aws/output-template.yml

aws cloudformation deploy --template-file ./aws/output-template.yml --stack-name buzzword-stack --capabilities CAPABILITY_NAMED_IAM
```

## Teardown

Run the following commands to delete the created stacks, along with their related resources:
```shell
aws cloudformation delete-stack --stack-name function-bucket-stack
aws cloudformation delete-stack --stack-name buzzword-stack
```