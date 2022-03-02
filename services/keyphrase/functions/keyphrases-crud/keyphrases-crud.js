const middy = require("@middy/core");
const validator = require("@middy/validator");
const httpErrorHandler = require("@middy/http-error-handler");
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { StatusCodes } = require("http-status-codes");

const { keyPhraseTableKeyFields } = require("./constants");

const ddbClient = new DynamoDBClient({});

const supportedMethods = Object.freeze({
    GET: "GET",
});

const INPUT_SCHEMA = {
    type: "object",
    required: ["httpMethod"],
    properties: {
        httpMethod: {
            type: "string",
            enum: Object.values(supportedMethods),
        },
        pathParameters: {
            type: "object",
            required: ["baseUrl"],
            properties: {
                baseUrl: {
                    type: "string",
                    pattern:
                        "^(http(s)?:\\/\\/)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$",
                },
            },
        },
    },
};

const removeUrlProtocol = (url) => {
    return url.replace("http://", "").replace("https://", "");
};

const getKeyphrases = async (baseUrl) => {
    const params = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "#baseUrl = :searchUrl",
        ExpressionAttributeNames: {
            "#baseUrl": keyPhraseTableKeyFields.HASH_KEY,
        },
        ExpressionAttributeValues: {
            ":searchUrl": { S: baseUrl },
        },
    };

    return await ddbClient.send(new QueryCommand(params));
};

const createResponse = (statusCode, body, contentType) => {
    const response = {
        statusCode,
        body,
    };

    if (contentType) {
        response.headers = {
            "Content-Type": contentType,
        };
    }

    return response;
};

const baseHandler = async (event) => {
    const baseUrl = removeUrlProtocol(event.pathParameters.baseUrl);
    try {
        const response = await getKeyphrases(baseUrl);
        if (response.Items.length === 0) {
            return createResponse(StatusCodes.NOT_FOUND);
        }

        return createResponse(
            StatusCodes.OK,
            JSON.stringify(response.Items),
            "application/json"
        );
    } catch (ex) {
        console.error(ex.message);

        return createResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            ex.message,
            "text/plain"
        );
    }
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }))
    .use(
        httpErrorHandler(
            process.env.ERROR_LOGGING_ENABLED === "false"
                ? { logger: false }
                : undefined
        )
    );

module.exports = {
    handler,
    supportedMethods,
};
