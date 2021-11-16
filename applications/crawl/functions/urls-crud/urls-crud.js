const middy = require('@middy/core');
const validator = require('@middy/validator');
const httpErrorHandler = require('@middy/http-error-handler');
const {
    DynamoDBClient,
    QueryCommand
} = require('@aws-sdk/client-dynamodb');
const { StatusCodes } = require('http-status-codes');

const { urlsTableKeyFields } = require('./constants');

const ddbClient = new DynamoDBClient({});

const supportedMethods = Object.freeze({
    GET: 'GET'
});

const INPUT_SCHEMA = {
    type: 'object',
    required: ['httpMethod'],
    properties: {
        httpMethod: {
            type: 'string',
            enum: Object.values(supportedMethods)
        },
        pathParameters: {
            type: 'object',
            required: ['baseUrl'],
            properties: {
                baseUrl: {
                    type: 'string',
                    // eslint-disable-next-line max-len
                    pattern: '(http(s)?:\\/\\/)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                }
            }
        }
    }
};

const getURLs = async (baseUrl) => {
    const params = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: '#baseUrl = :searchUrl',
        ExpressionAttributeNames: {
            '#baseUrl': urlsTableKeyFields.HASH_KEY
        },
        ExpressionAttributeValues: {
            ':searchUrl': { S: baseUrl }
        }
    };

    return await ddbClient.send(new QueryCommand(params));
};

const createResponse = (statusCode, body, contentType) => {
    return {
        statusCode,
        body,
        headers: {
            'Content-Type': contentType
        }
    };
};

const baseHandler = async (event) => {
    try {
        const response = await getURLs(event.pathParameters.baseUrl);

        return createResponse(
            StatusCodes.OK,
            JSON.stringify(response.Items),
            'application/json'
        );
    } catch (ex) {
        console.error(ex.message);

        return createResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            ex.message,
            'text/plain'
        );
    }
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
    handler,
    supportedMethods
};
