# how-many-buzzwords

[![Validate and Deploy](https://github.com/ashley-evans/how-many-buzzwords/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ashley-evans/how-many-buzzwords/actions/workflows/ci.yml)

Some buzzwords are incredibly overused, a simple tool tool to find the biggest culprits

## Requirements

The following CLI tools must be installed to validate, build, and test the buzzword stack resources:
- AWS CLI - More information can be found here: https://aws.amazon.com/cli/
- SAM CLI - More information can be found here: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html

In order to execute the teardown script, jq must be installed.
```shell
sudo apt-get install jq
```

## Install Dependencies

Run the following command to install all of the dependencies for the buzzword project:
```shell
find ! -path "*/node_modules/*" ! -path "*/.aws-sam/*" -name package.json -execdir npm ci \;
```

## Cloudformation Template Validation

Run the following command to validate the stack template definition:
```shell
sam validate --template ./aws/templates/buzzword-bucket-template.yml
sam validate --template ./aws/templates/buzzword-template.yml
sam validate --template ./aws/templates/buzzword-ci-users.yml
```

## Setup

Run the following commands to deploy a development buzzword stack:
```shell
cd ./aws/scripts
chmod u+x ./deploy.sh
./deploy.sh
```

## Teardown

Run the following commands to delete the created stacks, along with their related resources:
```shell
cd ./aws/scripts
chmod u+x ./teardown.sh
./teardown.sh
```

## Local Testing of Lambda functions

Run the following commands to invoke lambda functions locally:
```shell
sam local start-lambda --template ./aws/templates/buzzword-template.yml
aws lambda invoke --function-name "INSERT_NAME_OF_LAMBDA_RESOURCE" --endpoint-url "http://127.0.0.1:3001" --no-verify-ssl local-lambda-output.txt
```

To debug the function locally, you can start the lambda function container in debug mode using the following command:
```shell
sam local start-lambda --debug-port 9229 --template ./aws/templates/buzzword-template.yml 
```

Once the lambda has been invoked, then you can attach the debugger to the process using the VS Code debug configuration called "Attach to Local SAM resources"

## CI Setup

The CI pipeline requires access to two users to perform both template validation and stack deployment. These user's can be created using the following command:
```shell
aws cloudformation deploy --template-file ./aws/templates/buzzword-ci-users.yml --stack-name buzzword-ci-users --capabilities CAPABILITY_IAM
```

The following GitHub secrets should be created with the following values (Referring to the resources in the `buzzword-ci-users.yml` file):

| Name                           | Value                               |
| ------------------------------ | ----------------------------------- |
| VALIDATE_AWS_ACCESS_KEY_ID     | BuzzwordValidateUser's `ACCESS_KEY` |
| VALIDATE_AWS_SECRET_ACCESS_KEY | BuzzwordValidateUser's `SECRET_KEY` |
| DEPLOY_AWS_ACCESS_KEY_ID       | BuzzwordDeployUser's `ACCESS_KEY`   |
| DEPLOY_AWS_SECRET_ACCESS_KEY   | BuzzwordDeployUser's `SECRET_KEY`   |

The above values can be found in the AWS Secret Manager secret named the same as the user's `AccessKeyId`

The template validation performed by the CI pipeline searches for `.yml` files that are suffixed with `-template`, therefore, if you wish for a template file to be validated then simply suffix the file with `-template`.
