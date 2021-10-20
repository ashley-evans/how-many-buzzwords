const middy = require('@middy/core');
const validator = require('@middy/validator');
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
    GoneException
} = require('@aws-sdk/client-apigatewaymanagementapi');
const { REMOVE_EVENT_NAME, GONE_EXCEPTION_MESSAGE } = require('./constants');

const SEARCH_KEY_EVENT = process.env.SEARCH_KEY_EVENT;

const ddbClient = new DynamoDBClient({});

const INPUT_SCHEMA = {
    type: 'object',
    required: ['Records'],
    properties: {
        Records: {
            type: 'array',
            items: {
                type: 'object',
                required: ['eventName', 'dynamodb'],
                properties: {
                    eventName: {
                        type: 'string'
                    },
                    dynamodb: {
                        type: 'object',
                        required: ['Keys'],
                        properties: {
                            Keys: {
                                type: 'object',
                                required: [SEARCH_KEY_EVENT],
                                properties: {
                                    [SEARCH_KEY_EVENT]: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: {
                                                type: 'string'
                                            }
                                        }
                                    }
                                }
                            },
                            NewImage: {
                                type: 'object',
                                required: [SEARCH_KEY_EVENT],
                                properties: {
                                    [SEARCH_KEY_EVENT]: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: {
                                                type: 'string'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

const getListeningClients = (clientSearchKey) => {
    const params = {
        TableName: process.env.TABLE_NAME,
        IndexName: process.env.INDEX_NAME,
        KeyConditionExpression: '#sk = :searchvalue',
        ExpressionAttributeNames: {
            '#sk': process.env.SEARCH_KEY_TABLE
        },
        ExpressionAttributeValues: {
            ':searchvalue': { S: clientSearchKey }
        }
    };

    return ddbClient.send(new QueryCommand(params));
};

const postDataToClient = async (endpoint, clientId, data) => {
    const apiGatewayClient = new ApiGatewayManagementApiClient({
        endpoint
    });

    const params = {
        ConnectionId: clientId,
        Data: JSON.stringify(data)
    };

    try {
        await apiGatewayClient.send(new PostToConnectionCommand(params));
    } catch (ex) {
        if (ex.message === GONE_EXCEPTION_MESSAGE ||
            ex instanceof GoneException) {
            console.log('Client unavailable, not repeating');
        } else {
            throw ex;
        }
    }
};

const baseHandler = async (event) => {
    for (const record of event.Records) {
        const recordKeys = record.dynamodb.Keys;
        const searchKeyValue = recordKeys[SEARCH_KEY_EVENT].S;
        const clients = await getListeningClients(searchKeyValue);

        for (const client of clients.Items) {
            let dataValue;
            if (record.eventName === REMOVE_EVENT_NAME) {
                dataValue = recordKeys;
            } else {
                dataValue = record.dynamodb.NewImage;
            }

            const data = {
                eventName: record.eventName,
                value: dataValue
            };
            await postDataToClient(
                client.ConnectionEndpoint.S,
                client.ConnectionId.S,
                data
            );
        }
    }
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
