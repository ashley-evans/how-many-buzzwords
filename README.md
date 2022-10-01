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

![Container diagram for Internet Banking System](https://www.plantuml.com/plantuml/png/bLVVRo8t47xdhvYYIir997cuwqkbIfS0TpcLv10apUFAkpk05MElR2-Kg_g_T-mr9cxMg7aAs9vllldcnv3FnZ9jsws0s_R7ZxtIDOm_mLX9oxX43HFErffj1uEVkAn4MoDih6tCRzVNckslrjnksh8rg2koG6clAhMzRWIJ3lBIs5hmydhywNBkZfxkPzTRPYngEYgYZwk6tWu6bbk1Rpt3Iccm6uGxjOSjauT8rC3oG634ROxQA7dXU8nW-4H_XlJt1jm1g9KttnpDosY-nz9mYoEwPnRsnD20LM0GuoCmbbbkBA-C9y9WpNSeZwR33uEEGt6hMbapVRWuMXR6Nn2FBF7X1_Xx002de2-2Z4MDWlpeGo7HaiaBmOoxAvY4AtZeheRkJgYs_gBfnGWMghK8ltuS0PCrB3_I_Syrcah_FWocfekgWk0DkjHokSuAJNS2B-TiZN3JD89NPAyaXP_ID_vTqT2xWftU4SCS0bqja5NMatqyD8ueR-mhqdEjTfm-0okvuFRWKiGbjvnP10OLrQ5mIMR7f7Ye7SSzQ1JqgExDveupNn-_-3g0KgizVQE8qf1EYVMEYYsljAA7ErvXKOOxbm5Fu_xLRSnkWjS3qszDfpEsBMisyh8ilImZM5fiu4ihAwUUwN8ytRaatcfUh_6yS46jLAerewphADRTu_qiLePJYS5Ykdo4c_ctAtXGbgyuOPgsT9agNT44ofscwCWOK18OwMv2YIGQJCgWGgj5KPUkPHSpc33BIcPyv9E3P5irkNqLpT8gZQOBW5YIXG71vGjzjihNRSXcquNjdvpr7dkjF7LNmYBqJkBVbNPKPwLqGYYu-oTRGozuQ3QQuBDrzCVnnV-efGnSWlB-cdAlOkb43y0a4mV3ZIyPLLMjrYWhfqKhhQk2LG1WljRIKl2VN3bSmLIoKg3BdR4edQ5LhzneDAsm9bQZLN7cai8UzXdBfQfUqBgIp6Gu0b9s4pqS---HVQxeZjcEC6xwjovmcT1nQ9KYBDCewGRe6sLo3S0gIoYk1YLskdTCR_mvFOtdPpacGfw4gGHtWjT8_eJfeKdaSymQfWtMQNVC_HbacsGuPjK63NZRC49MMcsFS-RK6TGROMDE_x8Nnsj2U3w-T2B8GvnGIlhcvkHPIxHkG2zGX5r_Pbt-oSdSkBNlTbbS-ku72hHkJpb7Tu-FSq8y0MON6E7Xta34yPh6TT9Rho62r5lWNopogpvF8YxmCF8o2yo5ayNetJ_VmZurtNKgJV7KkxJEx7gKTK3o4hK6sgRsy5Ovx5YevE2MUnUPMNRMJLX1QFf7Y2l0r5lGfY-Q_ooa1RAwG_29tciUsCSU95F2Em-NzD1pnF1T0sFVeq7YMIzAR8_m2y50G0on9IMLLJ2Ulp-q76HcUhq7krXaqTC9b4FEY9b9ICvNKgoLsZO2BORD5U2JdrVdTCaqrrUq9ld945VfcycmlFl-NCocNwSFamlw-fcukV-D_WK0 "Container diagram for the How many Buzzwords System")

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
npm run ci
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

Generate a `.env` file in the `./ui` folder by running the following the command:

```
./scripts/helpers/generate-ui-env.sh \
    -c $INSERT_NAME_OF_CRAWL_STACK \
    -k $INSERT_NAME_OF_KEYPHRASE_STACK \
    -o ./ui/.env
```

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
xargs -r0a <(find ! -path "*/.aws-sam/*" -name *-template.yml -print0) -I {} sh -c 'cfn-lint {} -i W3002'
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
