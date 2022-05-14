# how-many-buzzwords

[![Validate and Deploy](https://github.com/ashley-evans/how-many-buzzwords/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ashley-evans/how-many-buzzwords/actions/workflows/ci.yml)

Some buzzwords are incredibly overused, a simple tool tool to find the biggest culprits

## General script usage

Each of the scripts used within this project have usage instructions, these can be found by providing the `-h` flag to each script.

You may need to give the scripts permissions to run on your system, this can be done by running the following command:

```shell
chmod u+x $(find ./scripts/ -type f)
```

## Requirements

The following CLI tools must be installed to validate, build, and test the buzzword stack resources:

-   AWS CLI - More information can be found here: https://aws.amazon.com/cli/
-   SAM CLI - More information can be found here: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
-   CloudFormation Linter - More information can be found here: https://github.com/aws-cloudformation/cfn-lint

Many of the scripts used within the project require `jq` to function, this can be installed by executing:

```shell
sudo apt-get install jq
```

## Install Dependencies

Run the following command to install all of the dependencies for the buzzword project:

```shell
npm run ci:sequential
```

Dependencies can also be installed in parallel by running:

```shell
npm run ci:parallel
```

## Cloudformation Template Validation

Run the following command to validate the stack template definition:

```shell
xargs -n1 -r0a <(find ! -path "*/.aws-sam/*" -name *-template.yml -print0) cfn-lint
```

## Running tests

Unit tests can be ran simply by running the following command:

```shell
npm run test:unit
```

Integration tests require a local instance of DynamoDB local running. This can be started by running:

```shell
./scripts/setup-local-db.sh -i
```

This will start a local instance and setup a GUI on http://localhost:8001 to view the DB's contents.

Once started, the integration tests can be ran using the following command:

```shell
npm run test:integration
```

## Deploy

Run the following commands to deploy all buzzword services:

```shell
./scripts/deploy.sh
```

## Teardown

Run the following commands to delete the created services, along with their related resources:

```shell
./scripts/teardown.sh
```

## Manually invoking the APIs

## Crawl/Find Buzzwords

To trigger a crawl of a particular URL to get it's buzzwords use the `test-crawl.sh` script.

Example usage:

```shell
./scripts/testing/test-crawl.sh -s dev -u https://www.example.com
```

## Listen to results

To listen to the results of a crawl in real time use the `test-connect.sh` script.

Example usage:

```shell
./scripts/testing/test-connect.sh -s dev -u https://www.example.com
```

## Local Testing of Lambda functions

Run the following commands to invoke lambda functions locally:

```shell
sam local start-lambda --template ./templates/buzzword-template.yml
aws lambda invoke --function-name "INSERT_NAME_OF_LAMBDA_RESOURCE" --endpoint-url "http://127.0.0.1:3001" --no-verify-ssl local-lambda-output.txt
```

To debug the function locally, you can start the lambda function container in debug mode using the following command:

```shell
sam local start-lambda --debug-port 9229 --template ./templates/buzzword-template.yml
```

Once the lambda has been invoked, then you can attach the debugger to the process using the VS Code debug configuration called "Attach to Local SAM resources"

## CI/CD Setup

The CI/CD pipeline requires specific permissions in order to perform validation and deployment. Run the following command to set up OIDC access for the CI pipeline (Replace the organisation and repository name values appropriately):

```shell
aws cloudformation deploy \
    --template-file ./templates/buzzword-ci-users-template.yml \
    --stack-name buzzword-ci-users \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides GithubOrganisation=$INSERT_VALUE RepositoryName=$INSERT_VALUE
```

Once the above command has executed, run the following commands to get the role ARNs:

```shell
./scripts/fetch-stack-outputs.sh -s buzzword-ci-users
```

The following GitHub secrets should be created with the appropriate key/value output from the previous command:

| Secret Name     | Output Key Value |
| --------------- | ---------------- |
| AWS_DEPLOY_ROLE | DeployRoleARN    |

The template validation performed by the CI pipeline searches for `.yml` files that are suffixed with `-template`, therefore, if you wish for a template file to be validated then simply suffix the file with `-template`.
