const middy = require("@middy/core");
const validator = require("@middy/validator");
const {
    DynamoDBClient,
    QueryCommand,
    DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
    GoneException,
} = require("@aws-sdk/client-apigatewaymanagementapi");
const {
    dynamoDBEventTypes,
    apiGatewayExceptionMessages,
    activeConnectionsTableKeyFields,
} = require("./constants");

const SEARCH_KEY = process.env.SEARCH_KEY;
const TABLE_NAME = process.env.TABLE_NAME;

const ddbClient = new DynamoDBClient({});

const INPUT_SCHEMA = {
    type: "object",
    required: ["Records"],
    properties: {
        Records: {
            type: "array",
            items: {
                type: "object",
                required: ["eventName", "dynamodb"],
                properties: {
                    eventName: {
                        type: "string",
                    },
                    dynamodb: {
                        type: "object",
                        required: ["Keys"],
                        properties: {
                            Keys: {
                                type: "object",
                                required: [SEARCH_KEY],
                                properties: {
                                    [SEARCH_KEY]: {
                                        type: "object",
                                        required: ["S"],
                                        properties: {
                                            S: {
                                                type: "string",
                                            },
                                        },
                                    },
                                },
                            },
                            NewImage: {
                                type: "object",
                                required: [SEARCH_KEY],
                                properties: {
                                    [SEARCH_KEY]: {
                                        type: "object",
                                        required: ["S"],
                                        properties: {
                                            S: {
                                                type: "string",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

const getListeningClients = (clientSearchKey) => {
    const params = {
        TableName: process.env.TABLE_NAME,
        IndexName: process.env.INDEX_NAME,
        KeyConditionExpression: "#sk = :searchvalue",
        ExpressionAttributeNames: {
            "#sk": activeConnectionsTableKeyFields.SECONDARY_INDEX_HASH,
        },
        ExpressionAttributeValues: {
            ":searchvalue": { S: clientSearchKey },
        },
    };

    return ddbClient.send(new QueryCommand(params));
};

const postDataToClient = async (endpoint, clientId, data) => {
    const apiGatewayClient = new ApiGatewayManagementApiClient({
        endpoint,
    });

    const params = {
        ConnectionId: clientId,
        Data: JSON.stringify(data),
    };

    try {
        await apiGatewayClient.send(new PostToConnectionCommand(params));
    } catch (ex) {
        if (
            ex.message === apiGatewayExceptionMessages.GONE_EXCEPTION ||
            ex instanceof GoneException
        ) {
            console.log("Client unavailable, removing connection details");

            const params2 = {
                TableName: TABLE_NAME,
                Key: {
                    [activeConnectionsTableKeyFields.PRIMARY_INDEX_HASH]:
                        clientId,
                },
            };

            await ddbClient.send(new DeleteItemCommand(params2));
        } else {
            throw ex;
        }
    }
};

const baseHandler = async (event) => {
    for (const record of event.Records) {
        const recordKeys = record.dynamodb.Keys;
        const searchKeyValue = recordKeys[SEARCH_KEY].S;
        const clients = await getListeningClients(searchKeyValue);

        for (const client of clients.Items) {
            let dataValue;
            if (record.eventName === dynamoDBEventTypes.REMOVE_EVENT_NAME) {
                dataValue = recordKeys;
            } else {
                dataValue = record.dynamodb.NewImage;
            }

            const data = {
                eventName: record.eventName,
                value: dataValue,
            };
            await postDataToClient(
                client.ConnectionEndpoint.S,
                client.ConnectionId.S,
                data
            );
        }
    }
};

const handler = middy(baseHandler).use(
    validator({ inputSchema: INPUT_SCHEMA })
);

module.exports = {
    handler,
};
