# how-many-buzzwords

[![Validate and Deploy](https://github.com/ashley-evans/how-many-buzzwords/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ashley-evans/how-many-buzzwords/actions/workflows/ci.yml)

Some buzzwords are incredibly overused, a simple tool tool to find the biggest culprits

**The currently released version of this project can be used here:**

-   https://howmanybuzzwords.com
-   https://howmanybuzzwords.co.uk

## High Level Architecture

This project comprises of a React (TypeScript) SPA and several microservices deployed on AWS that communicate between each other using events.

The microservices use a Serverless architecture, making use of Lambda, API Gateway (HTTP/WebSocket), Step Functions, DynamoDB etc. The lambda functions are _largely_ written using TypeScript, however, a transition from JavaScript is still in progress.

The following [C4 Container diagram](https://c4model.com/#ContainerDiagram) shows how the various components of the How many buzzwords system provide the functionality provided on the site:

![Container diagram for Internet Banking System](https://www.plantuml.com/plantuml/png/dLTHJoCt47xFhvX6bSf90HwulbIgT41onwc1Yn8eZollxX0i77jbUvFcglxtpdWT9wl4gDSdbhNdcs---NO6FZalh6zN2cxQxzytnjPm-n5kZVP2QhGmbc9fnMem-4dgIhKrmgltZVljyjAApSLI-jUsR1tQYY9G-ulAh2uR9JH3dZjVArbUtduyd_6hf_lfvKeuZvPU5Id7HKDt1mCllSBZpF1YBFXNX3kpWPNGsqJKmM9BOCHjXjOPVSOyHZ1yeXz3-daD_0BCImX_tOMNANo3fPCUHtGkF6o8eGDlm26cI-2yyD9vMRb0HC1Ihb7lGeSV1Xs7uiQqkXPsUxQBB5mu81vPuiCFyFS00FP5dqKPYneLvR7RGgEda3U2kUsEO1oFuA4x6lAPCctzsTAD4SnDwn5-lHg1q3KihkZyvnfTPNyVnb3NLLL1p0PTQwLUPeMcCuNdCx54k6uQ9IkADvhAxzDtuLxHqBr2xEyHmnm27SrHL3wGVTmsJ5Gs_e3qp9grf6SGfLJIRxb5KailXKSGK94F5JTPx9eIeDOIDs1HqQNwP3VNKWH__19y0AKr6_gDAkgNj6ziI5IiP6KDNLpB2eiodd470etxWzFKtHxU2PZJqVHsAbPbBKP1baMGPGGBZmryRdN5whcknvCrD_76odg9xmiNrUfBjHJKTPl4kdkydoPdi4e2vfF58rpFlbx0W_7oHHAcQqlkLCccYPGxJP79E30Q1EdkID0Z3SPbLA6rggXB_cJdKnWBBqhXGkNZhHOhCxuvg6RXZKNN5K0iASA1algDdhq9letTRBgomvLtiwTlhTn_NJqMYwlZ_6pjf0vDX1wXcEwVh8VUSDkyMeBF-kYFtOt_uAKCN1_bXpt5jv9rKWOGMgYjaovOnbHLQotgYhLejMSNl4G04RpMjq9uOZjSm4IBKY7tpddK7EZDGHhIk5NU9JTwasOkAHnWdx5ScEeDFLioq-44IDtjwS7iloNsETFjkfrWUFgtNBZkqM6qoX2MQupc0NgaJEu349Kd5FQWnaxtZkbrU4zNq_jtEVQ4t0jJASc2rqZvb3kcsNSh-JLkiSbV_YoE1aSPdkDZsAPwcwQ6qU63azgZrUXvQCvHnVtxpWhxKrAuurNC-oKjOlwZ0LhU7Ppexl5nHeXxmEnI8JpSk8E5BdHln1zxA5NGonRv5_Fy-isJI4irZg7CKk5oiXWdTyBNkEDS8Xsk4GP_1Unzg8HId9SBuHbDYTxDavqNq-0XXaeV8EVOkpCcIGxRIJOzkS_wqvqNVEtWnPfLwD36igSOCHcQGZlknLCUi3-mdmzH5bTm6opVePp4IBwEwzP1nCkP8QTMUly_gik2vkR1Zw1FC-WPWotY2WzutHMIPDKez1XdDsVf_NKH4ktJv2N-WjxrzcJQ7qTgB-w-FHVJoPV9m_YCVls4kkP_2Fu5 "Container diagram for the How many Buzzwords System")

A larger set of C4 model diagrams can be found in the `docs` folder.

## Requirements

The following CLI tools must be installed to validate, build, and test the how many buzzword components:

-   AWS CLI - More information can be found here: https://aws.amazon.com/cli/
-   SAM CLI - More information can be found here: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
-   CloudFormation Linter - More information can be found here: https://github.com/aws-cloudformation/cfn-lint

Many of the scripts used within the project require `jq` to function, this can be installed by executing:

```shell
sudo apt-get install jq
```

### General script usage

Each of the scripts used within this project have usage instructions, these can be found by providing the `-h` flag to each script.

You may need to give the scripts permissions to run on your system, this can be done by running the following command:

```shell
chmod u+x $(find ./scripts/ -type f)
```

## Usage

### Install Dependencies

Run the following command to install all of the dependencies for the project:

```shell
npm run ci:sequential
```

Dependencies can also be installed in parallel by running:

```shell
npm run ci:parallel
```

### Deploying components to AWS

Run the following commands to deploy all components:

```shell
./scripts/deploy.sh
```

### Tearing down deployed components

Run the following commands to teardown all deployed components, along with their related resources:

```shell
./scripts/teardown.sh
```

### Running the SPA component locally

Requires a `.env` file in the `./ui/` folder with the following values configured to the environment at test:

| Environment Variable          | Description                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| CRAWL_SERVICE_ENDPOINT        | The HTTP API Gateway endpoint for the crawl service          |
| KEYPHRASE_WS_SERVICE_ENDPOINT | The WebSocket API Gateway endpoint for the keyphrase service |

Run the following script to run the UI locally:

```
npm --prefix ./ui/ start
```

### Running tests

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

### Cloudformation Template Validation

Run the following command to validate all template definitions within the project:

```shell
xargs -n1 -r0a <(find ! -path "*/.aws-sam/*" -name *-template.yml -print0) cfn-lint
```

### Programatically starting a crawl

The `test-crawl.sh` script can be used to trigger a crawl without running the UI:

Example usage:

```shell
./scripts/testing/test-crawl.sh -s dev -u https://www.example.com
```

### Programatically listening to results

The `test-connect.sh` script can be used to listen to the results of a crawl in real time without running the UI:

Example usage:

```shell
./scripts/testing/test-connect.sh -s dev -u https://www.example.com
```

### Local Testing of Lambda functions

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
