const middy = require('@middy/core');
const validator = require('@middy/validator');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const ddbClient = new DynamoDBClient({});

const { CONNECT_ROUTE_KEY } = require('./constants');

const INPUT_SCHEMA = {
    type: 'object',
    required: ['requestContext'],
    properties: {
        requestContext: {
            type: 'object',
            required: ['connectionId', 'domainName', 'stage', 'routeKey'],
            properties: {
                connectionId: {
                    type: 'string'
                },
                domainName: {
                    type: 'string',
                    // eslint-disable-next-line max-len
                    pattern: '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$'
                },
                stage: {
                    type: 'string'
                },
                routeKey: {
                    type: 'string'
                }
            }
        }
    }
};

const storeIncomingRequest = async (connectionId, domainName, stage) => {
    const connectionEndpoint = `https://${domainName}/${stage}`;
    const params = {
        TableName: process.env.TABLE_NAME,
        Item: {
            ConnectionId: connectionId,
            ConnectionEndpoint: connectionEndpoint
        }
    };

    await ddbClient.send(new PutItemCommand(params));
};

const baseHandler = async (event) => {
    const requestContext = event.requestContext;
    if (requestContext.routeKey === CONNECT_ROUTE_KEY) {
        storeIncomingRequest(
            requestContext.connectionId,
            requestContext.domainName,
            requestContext.stage
        );
    }
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
