const middy = require('@middy/core');
const validator = require('@middy/validator');
const httpErrorHandler = require('@middy/http-error-handler');
const {
    DynamoDBClient,
    PutItemCommand,
    DeleteItemCommand
} = require('@aws-sdk/client-dynamodb');
const { StatusCodes } = require('http-status-codes');
const ddbClient = new DynamoDBClient({});

const { CONNECT_ROUTE_KEY, DISCONNECT_ROUTE_KEY } = require('./constants');

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

const storeConnection = async (connectionId, domainName, stage) => {
    const connectionEndpoint = `https://${domainName}/${stage}`;
    const params = {
        TableName: process.env.TABLE_NAME,
        Item: {
            ConnectionId: { S: connectionId },
            ConnectionEndpoint: { S: connectionEndpoint }
        }
    };

    await ddbClient.send(new PutItemCommand(params));
};

const deleteConnection = async (connectionId) => {
    const params = {
        TableName: process.env.TABLE_NAME,
        Key: {
            ConnectionId: { S: connectionId }
        }
    };

    await ddbClient.send(new DeleteItemCommand(params));
};

const createResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'text/plain'
        },
        body
    };
};

const baseHandler = async (event) => {
    const requestContext = event.requestContext;
    try {
        if (requestContext.routeKey === CONNECT_ROUTE_KEY) {
            await storeConnection(
                requestContext.connectionId,
                requestContext.domainName,
                requestContext.stage
            );

            return createResponse(StatusCodes.OK, 'Connected successfully.');
        } else if (requestContext.routeKey === DISCONNECT_ROUTE_KEY) {
            await deleteConnection(requestContext.connectionId);

            return createResponse(StatusCodes.OK, 'Disconnected successfully.');
        } else {
            console.log(
                `Received route key: ${requestContext.routeKey} ` +
                `from ${requestContext.domainName}`
            );
            return createResponse(
                StatusCodes.BAD_REQUEST,
                'Cannot process connection.'
            );
        }
    } catch (ex) {
        console.error(ex);
        return createResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            'Failed to process connection.'
        );
    };
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }))
    .use(
        httpErrorHandler(
            process.env.ERROR_LOGGING_ENABLED === 'false'
                ? { logger: false }
                : undefined
        )
    );

module.exports = {
    handler
};
