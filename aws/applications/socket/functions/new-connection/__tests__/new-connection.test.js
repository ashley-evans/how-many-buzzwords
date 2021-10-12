const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const {
    ApiGatewayManagementApiClient
} = require('@aws-sdk/client-apigatewaymanagementapi');
const { mockClient } = require('aws-sdk-client-mock');

const EXPECTED_CONNECTION_ENDPOINT = 'https://test.test.com/prod';
const EXPECTED_CONNECTION_ID = 'Gyvd8cAwLPECHlQ=';
const EXPECTED_SEARCH_KEY_VALUE = 'valid_key';
const TABLE_NAME = 'test';
const SEARCH_KEY = 'BaseUrl';

process.env.TABLE_NAME = TABLE_NAME;
process.env.SEARCH_KEY = SEARCH_KEY;
process.env.SEARCH_KEY_PATTERN = EXPECTED_SEARCH_KEY_VALUE;

const ddbMock = mockClient(DynamoDBClient);
const apiMock = mockClient(ApiGatewayManagementApiClient);

const { handler } = require('../new-connection');

const createEvent = (...records) => {
    return {
        Records: records
    };
};

const createRecord = (connectionEndpoint, connectionId, searchKey) => {
    return {
        dynamodb: {
            NewImage: {
                ConnectionEndpoint: { S: connectionEndpoint },
                ConnectionId: { S: connectionId },
                SearchKey: { S: searchKey }
            }
        }
    };
};

describe('input validation', () => {
    test.each([
        ['event with missing records', { Records: undefined }],
        [
            'record with missing dynamoDB field',
            createEvent({ dynamodb: undefined })
        ],
        [
            'record with missing NewImage field',
            createEvent({ dynamodb: { NewImage: undefined } })
        ],
        [
            'record with missing connection endpoint',
            createEvent(createRecord())
        ],
        [
            'record with invalid connection endpoint',
            createEvent(createRecord('not a url'))
        ],
        [
            'record with missing connection id',
            createEvent(createRecord(EXPECTED_CONNECTION_ENDPOINT))
        ],
        [
            'record with missing search key',
            createEvent(
                createRecord(
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID
                )
            )
        ],
        [
            'record with invalid search key',
            createEvent(
                createRecord(
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID,
                    'invalid search key'
                )
            )
        ]
    ])(
        'returns failed validation error given %s',
        async (message, event) => {
            await expect(handler(event)).rejects.toThrowError(
                'Event object failed validation'
            );
        }
    );
});

describe.each([
    [
        'a single connection stream event',
        createEvent(
            createRecord(
                EXPECTED_CONNECTION_ENDPOINT,
                EXPECTED_CONNECTION_ID,
                EXPECTED_SEARCH_KEY_VALUE
            )
        )
    ],
    [
        'multiple connection stream events',
        createEvent(
            createRecord(
                EXPECTED_CONNECTION_ENDPOINT,
                EXPECTED_CONNECTION_ID,
                `${EXPECTED_SEARCH_KEY_VALUE}1`
            ),
            createRecord(
                EXPECTED_CONNECTION_ENDPOINT,
                EXPECTED_CONNECTION_ID,
                `${EXPECTED_SEARCH_KEY_VALUE}2`
            )
        )
    ]
])('%s', (message, event) => {
    beforeAll(async () => {
        for (const record of event.Records) {
            const searchKeyValue = record.dynamodb.NewImage.SearchKey.S;
            ddbMock
                .on(QueryCommand, {
                    TableName: TABLE_NAME,
                    KeyConditionExpression: '#sk = :searchvalue',
                    ExpressionAttributeNames: {
                        '#sk': SEARCH_KEY
                    },
                    ExpressionAttributeValues: {
                        ':searchvalue': searchKeyValue
                    }
                })
                .resolves({
                    Items: [
                        {
                            [SEARCH_KEY]: searchKeyValue
                        }
                    ]
                });
        }

        await handler(event);
    });

    test('queries dynamodb with search value', () => {
        const dynamoDbCallsInputs = ddbMock.calls()
            .map(call => call.args[0].input);

        expect(dynamoDbCallsInputs).toHaveLength(event.Records.length);

        for (const record of event.Records) {
            const searchKeyValue = record.dynamodb.NewImage.SearchKey.S;
            expect(dynamoDbCallsInputs).toContainEqual({
                TableName: TABLE_NAME,
                KeyConditionExpression: '#sk = :searchvalue',
                ExpressionAttributeNames: {
                    '#sk': SEARCH_KEY
                },
                ExpressionAttributeValues: {
                    ':searchvalue': searchKeyValue
                }
            });
        }
    });

    test('sends results from dynamodb to connection endpoint and id', () => {
        const apiGatewayCallsInputs = apiMock.calls()
            .map(call => call.args[0].input);

        expect(apiGatewayCallsInputs).toHaveLength(event.Records.length);

        for (const record of event.Records) {
            const searchKeyValue = record.dynamodb.NewImage.SearchKey.S;
            expect(apiGatewayCallsInputs).toContainEqual({
                ConnectionId: EXPECTED_CONNECTION_ID,
                Data: JSON.stringify([
                    {
                        [SEARCH_KEY]: searchKeyValue
                    }
                ])
            });
        }
    });

    afterAll(() => {
        ddbMock.reset();
        apiMock.reset();
    });
});

/* ddbMock
.on(QueryCommand, {
    TableName: TABLE_NAME,
    KeyConditionExpression: '#sk = :searchvalue',
    ExpressionAttributeNames: {
        '#sk': SEARCH_KEY
    },
    ExpressionAttributeValues: {
        ':searchvalue': EXPECTED_SEARCH_KEY_VALUE
    }
})
.resolves({
    Items: [
        {
            [SEARCH_KEY]: EXPECTED_SEARCH_KEY_VALUE
        }
    ]
}); */
