const middy = require('@middy/core');
const validator = require('@middy/validator');
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand
} = require('@aws-sdk/client-apigatewaymanagementapi');

const SEARCH_KEY = process.env.SEARCH_KEY;

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
                                required: [SEARCH_KEY],
                                properties: {
                                    [SEARCH_KEY]: {
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
                                required: [SEARCH_KEY],
                                properties: {
                                    [SEARCH_KEY]: {
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
        KeyConditionExpression: '#sk = :searchvalue',
        ExpressionAttributeNames: {
            '#sk': SEARCH_KEY
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

    await apiGatewayClient.send(new PostToConnectionCommand(params));
};

const baseHandler = async (event) => {
    for (const record of event.Records) {
        const recordNewImage = record.dynamodb.NewImage;
        const searchKeyValue = recordNewImage[SEARCH_KEY].S;
        const clients = await getListeningClients(searchKeyValue);

        for (const client of clients.Items) {
            await postDataToClient(
                client.ConnectionEndpoint.S,
                client.ConnectionId.S,
                recordNewImage
            );
        }
    }
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
