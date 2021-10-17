const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const {
    ApiGatewayManagementApiClient
} = require('@aws-sdk/client-apigatewaymanagementapi');
const { mockClient } = require('aws-sdk-client-mock');
const {
    INSERT_EVENT_NAME,
    MODIFY_EVENT_NAME,
    REMOVE_EVENT_NAME,
    GONE_EXCEPTION_MESSAGE
} = require('../../constants');

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

const createRecord = (
    eventName,
    connectionEndpoint,
    connectionId,
    searchKey
) => {
    return {
        eventName,
        dynamodb: {
            NewImage: {
                ConnectionEndpoint: { S: connectionEndpoint },
                ConnectionId: { S: connectionId },
                SearchKey: { S: searchKey }
            }
        }
    };
};

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('input validation', () => {
    test.each([
        ['event with missing records', { Records: undefined }],
        [
            'record with missing dynamoDB field',
            createEvent({ dynamodb: undefined, eventName: INSERT_EVENT_NAME })
        ],
        [
            'record with missing event name',
            createEvent(
                createRecord(
                    undefined,
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_SEARCH_KEY_VALUE
                )
            )
        ],
        [
            'record with missing connection endpoint',
            createEvent(
                createRecord(
                    INSERT_EVENT_NAME,
                    undefined,
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_SEARCH_KEY_VALUE
                )
            )
        ],
        [
            'record with invalid connection endpoint',
            createEvent(
                createRecord(
                    INSERT_EVENT_NAME,
                    'not a url',
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_SEARCH_KEY_VALUE
                )
            )
        ],
        [
            'record with missing connection id',
            createEvent(
                createRecord(
                    INSERT_EVENT_NAME,
                    EXPECTED_CONNECTION_ENDPOINT,
                    undefined,
                    EXPECTED_SEARCH_KEY_VALUE
                )
            )
        ],
        [
            'record with missing search key',
            createEvent(
                createRecord(
                    INSERT_EVENT_NAME,
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID
                )
            )
        ],
        [
            'record with invalid search key',
            createEvent(
                createRecord(
                    INSERT_EVENT_NAME,
                    undefined,
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
        'a single insert connection stream event',
        createEvent(
            createRecord(
                INSERT_EVENT_NAME,
                EXPECTED_CONNECTION_ENDPOINT,
                EXPECTED_CONNECTION_ID,
                EXPECTED_SEARCH_KEY_VALUE
            )
        )
    ],
    [
        'multiple insert connection stream events',
        createEvent(
            createRecord(
                INSERT_EVENT_NAME,
                EXPECTED_CONNECTION_ENDPOINT,
                EXPECTED_CONNECTION_ID,
                `${EXPECTED_SEARCH_KEY_VALUE}1`
            ),
            createRecord(
                INSERT_EVENT_NAME,
                EXPECTED_CONNECTION_ENDPOINT,
                EXPECTED_CONNECTION_ID,
                `${EXPECTED_SEARCH_KEY_VALUE}2`
            )
        )
    ]
])('happy path: %s', (message, event) => {
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
                        ':searchvalue': { S: searchKeyValue }
                    }
                })
                .resolves({
                    Items: [
                        {
                            [SEARCH_KEY]: { S: searchKeyValue }
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
                    ':searchvalue': { S: searchKeyValue }
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
                        [SEARCH_KEY]: { S: searchKeyValue }
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

describe.each([
    [
        'a modify connection stream event',
        createEvent(
            createRecord(
                MODIFY_EVENT_NAME,
                EXPECTED_CONNECTION_ENDPOINT,
                EXPECTED_CONNECTION_ID,
                EXPECTED_SEARCH_KEY_VALUE
            )
        )
    ],
    [
        'a remove connection stream event',
        createEvent(
            createRecord(
                REMOVE_EVENT_NAME,
                EXPECTED_CONNECTION_ENDPOINT,
                EXPECTED_CONNECTION_ID,
                EXPECTED_SEARCH_KEY_VALUE
            )
        )
    ],
    [
        'a insert event with no new image field',
        createEvent(
            {
                eventName: INSERT_EVENT_NAME,
                dynamodb: {
                    NewImage: undefined
                }
            }
        )
    ]
])('invalid event paths: %s', (message, event) => {
    beforeAll(async () => {
        await handler(event);
    });

    test('does not query dynamodb', () => {
        const dynamoDbCalls = ddbMock.calls();

        expect(dynamoDbCalls).toHaveLength(0);
    });

    test('does not send data to connection endpoint and id', () => {
        const apiGatewayCalls = apiMock.calls();

        expect(apiGatewayCalls).toHaveLength(0);
    });

    afterAll(() => {
        ddbMock.reset();
        apiMock.reset();
    });
});

describe('Error handling', () => {
    test(
        'handler catches gone exception when client no longer available',
        (done) => {
            const expectedErrorMessage = GONE_EXCEPTION_MESSAGE;

            const event = createEvent(
                createRecord(
                    INSERT_EVENT_NAME,
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_SEARCH_KEY_VALUE
                )
            );
            ddbMock
                .on(QueryCommand)
                .resolves({
                    Items: [
                        {
                            [SEARCH_KEY]: EXPECTED_SEARCH_KEY_VALUE
                        }
                    ]
                });
            apiMock.rejects(expectedErrorMessage);

            handler(event)
                .then(() => {
                    done();
                })
                .catch(ex => {
                    if (ex.message === expectedErrorMessage) {
                        done(
                            `Received ${expectedErrorMessage} when not expected`
                        );
                    } else {
                        done(
                            `Received: (${ex}) when only GoneException thrown`
                        );
                    }
                });
        }
    );

    test(
        'handler throws exception when api post fails for unexpected reason',
        async () => {
            const event = createEvent(
                createRecord(
                    INSERT_EVENT_NAME,
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_SEARCH_KEY_VALUE
                )
            );
            ddbMock
                .on(QueryCommand)
                .resolves({
                    Items: [
                        {
                            [SEARCH_KEY]: EXPECTED_SEARCH_KEY_VALUE
                        }
                    ]
                });
            apiMock.rejects();

            await expect(handler(event)).rejects.toThrowError();
        }
    );

    test(
        'handler throws exception when database query errors for any reason',
        async () => {
            const event = createEvent(
                createRecord(
                    INSERT_EVENT_NAME,
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_SEARCH_KEY_VALUE
                )
            );
            ddbMock.rejects();

            await expect(handler(event)).rejects.toThrowError();
        }
    );

    afterEach(() => {
        ddbMock.reset();
        apiMock.reset();
    });
});
