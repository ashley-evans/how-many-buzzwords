# how-many-buzzwords

[![Validate and Deploy](https://github.com/ashley-evans/how-many-buzzwords/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ashley-evans/how-many-buzzwords/actions/workflows/ci.yml)

Some buzzwords are incredibly overused, a simple tool tool to find the biggest culprits

**The currently released version of this project can be used here:**

-   https://howmanybuzzwords.com
-   https://howmanybuzzwords.co.uk

## High Level Architecture

The following [C4 Container diagram](https://c4model.com/#ContainerDiagram) shows how the various components of the How many buzzwords system provide the functionality provided on the site:

![Container diagram for Internet Banking System](https://www.plantuml.com/plantuml/png/dLTHRzis47xthxWP0vO2RlAGxcN0W2QnsnHpKiDAbaU1aYus4PeKICgUE-o_xuwIQSinqtLFKKJUTzzzz-ak-UYyiBvPARXkldtR65l1pGUuCTeBgT72M8g55Ql1u2UfIzLK24llQ_VRnOKLc_E5zCkcQ1pQaY9G-_FIh2vg9JH3ldU-KhAukFdmViQl7k-c5olXF5fwbSSSvpNT7Goyz0fVPuPdOy4l4MxD1bP2RoDH1zcMm8ZR3Aqp-envZ63uI3-6zFCA-0MOvn2-t8KNCNo3XPCUHtGkF6o8eGDlm276I-2yyD9vMRf0HC12hb7lGeVl1Ys7_DeqkX9sUxQBp5qu81v9uiDtyFS00FP5dtKovXKgocEtkKPF8Iy4SzCUmRWxWllsQCXdoZJL9qitHZ0tZKVuzN84GbUGNTBvpnMwqlu-x49TMrK9NJPeMolr8YaqdIbyFnCBXAkwLhAaUAEf_3vz5-xbDTtBnVuUCKmXqD4SHUa3sOTjpKHbxGz8pwnPIte6KKWb_PPR9BNqKdW40INvK76JnQuf0MejSGCM5LsgJdPpBKNmno_11r1Oiw7VgA9Gqd5NGvPy9KjhwDPQbfWNtHdB7pZS7Pp6rlRqEG5pEfhUJiMggCGeQ985JKQGUQpXKwDBbiwr3PwikOFNLbOB_8vg8VkHJWj1BRTHgTk7kscq1KiaO3x97k1gzkKSxesNpv8mNLDmcmfsJ4Uv5HIPZ0EZGP3eZlrnhC6uw5HehCghWh_N-HJ6mej2k53vUAl5oeol3wh9lB7esWA89KKuK5A_qBCtmRHTA-ksx73bpUpnGolsdrQFHNRvEZ_xEgf3uw17g4ltpsa3lU2sNbh2JfheZzsD_s2a15mVvOSDnRUYRs8645gehPCk-CMKPMCjwfA5QBHd2pnt08ADTkI3yCHUE8U95eL2Rfppg3dGcuCq972Zl8jMz2PEMv8tm3vXaPdo1JtxCT7U24YjxUd1xBz6zYd7xLeTONZkDrouxj5XjD8GbgkD3gFpM9cK-qNf2OKDgB7LlMLw5TxJrVZ-UnoZa0V2b4gou1LIFkLEqEnPbSpQ6NNobp_hveAZ34_TOzYZUXj7Xj7XQvFQezNeULpEKNMRzutbzQUaSCTBc3TBNC7yvm8ql3KuqUt3mumGzu39TK9uk74GSKATSRYVyb2iu3WRfyldwSMR9X7NQJU34kk4oqbYd5m8NxhjvYBfS8qm-2jWxqCfbEAyN0WFQ4hqPfxal9W63p5K_00vnzwTNPBei9raqvFBx6Yqpr5K3fwjMOKERInxYX6ZeIcqvPu_fW7xq_hf42MxX9jW-HRb94RqTRThtSwfAJEar8hl_qTrIT34FFWXz6a2FM6mhDlV0Q-zGfAiQeKUkzdDMNf_MeH4-pHfYJ-ZTxqb6VV7AxMpswzF-NJoUN8_FgDVFwAk-5-1Vm40 "Container diagram for the How many Buzzwords System")

A larger set of C4 model diagrams can be found in the `docs` folder.

## Requirements

The following CLI tools must be installed to validate, build, and test the buzzword stack resources:

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

Run the following command to install all of the dependencies for the buzzword project:

```shell
npm run ci:sequential
```

Dependencies can also be installed in parallel by running:

```shell
npm run ci:parallel
```

### Deploying the backend services

Run the following commands to deploy all buzzword services:

```shell
./scripts/deploy.sh
```

### Tearing down the backend services

Run the following commands to teardown all deployed services, along with their related resources:

```shell
./scripts/teardown.sh
```

### Running the UI locally

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

Run the following command to validate the stack template definition:

```shell
xargs -n1 -r0a <(find ! -path "*/.aws-sam/*" -name *-template.yml -print0) cfn-lint
```

### Crawl/Find Buzzwords

The `test-crawl.sh` script can be used to trigger a crawl without running the UI:

Example usage:

```shell
./scripts/testing/test-crawl.sh -s dev -u https://www.example.com
```

### Listen to results

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
