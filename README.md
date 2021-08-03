# how-many-buzzwords
Some buzzwords are incredibly overused, a simple tool tool to find the biggest culprits

## Cloudformation Template Validation

Run the following command to validate your Cloudformation template definition:
```shell
aws cloudformation validate-template --template-body file://template.file
```

## Setup

In order to setup this application from scratch the AWS CLI (Version 2.x) must be installed onto your machine. See the AWS documentation here for more information:
- https://aws.amazon.com/cli/

Once the CLI has been installed, then run the following commands:
```shell
cd ./aws/scripts
chmod u+x ./deploy.sh
./deploy.sh
```

## Teardown

Run the following commands to delete the created stacks, along with their related resources:
```shell
aws cloudformation delete-stack --stack-name function-bucket-stack
aws cloudformation delete-stack --stack-name buzzword-stack
```

## Local Testing of Lambda functions

A lambda function can be ran locally using the SAM CLI tool. See the SAM CLI documentation here for more information on setup:
- https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html

Once the SAM CLI tool and its requirements have been installed, a local lambda service can be started locally by running:
```shell
sam local start-lambda --template ./aws/templates/buzzword-template.yml 
```

Once started, a lambda function can be invoked by running:
```shell
aws lambda invoke --function-name "INSERT_NAME_OF_LAMBDA_RESOURCE" --endpoint-url "http://127.0.0.1:3001" --no-verify-ssl local-lambda-output.txt
```

To debug the function locally, you can start the lambda function container in debug mode using the following command:
```shell
sam local start-lambda --debug-port 9229 --template ./aws/templates/buzzword-template.yml 
```

Once the lambda has been invoked, then you can attach the debugger to the process using the VS Code debug configuration called "Attach to Local SAM resources"
