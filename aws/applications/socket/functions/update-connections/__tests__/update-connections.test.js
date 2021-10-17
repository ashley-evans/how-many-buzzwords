const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const {
    ApiGatewayManagementApiClient
} = require('@aws-sdk/client-apigatewaymanagementapi');
const { mockClient } = require('aws-sdk-client-mock');
const {
    INSERT_EVENT_NAME
} = require('../../constants');

const TABLE_NAME = 'test';
const SEARCH_KEY = 'BaseUrl';
const EXPECTED_SEARCH_KEY_VALUE = 'valid_key';
const EXPECTED_CONNECTION_ENDPOINT = 'https://test.test.com/prod';
const EXPECTED_CONNECTION_ID = 'Gyvd8cAwLPECHlQ=';

process.env.TABLE_NAME = TABLE_NAME;
process.env.SEARCH_KEY = SEARCH_KEY;

const ddbMock = mockClient(DynamoDBClient);
const apiMock = mockClient(ApiGatewayManagementApiClient);

const { handler } = require('../update-connections');

const createEvent = (...records) => {
    return {
        Records: records
    };
};

const createRecord = (
    eventName,
    searchKey
) => {
    return {
        eventName,
        dynamodb: {
            NewImage: {
                [SEARCH_KEY]: { S: searchKey }
            }
        }
    };
};

describe('input validation', () => {
    test.each([
        ['event with missing records', { Records: undefined }],
        [
            'record with missing dynamoDB field',
            createEvent({ dynamodb: undefined, eventName: INSERT_EVENT_NAME })
        ],
        [
            'record with missing search key field',
            createEvent(
                createRecord(
                    INSERT_EVENT_NAME
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
                EXPECTED_SEARCH_KEY_VALUE
            )
        )
    ],
    [
        'multiple insert connection stream events',
        createEvent(
            createRecord(
                INSERT_EVENT_NAME,
                `${EXPECTED_SEARCH_KEY_VALUE}1`
            ),
            createRecord(
                INSERT_EVENT_NAME,
                `${EXPECTED_SEARCH_KEY_VALUE}2`
            )
        )
    ]
])('happy path: %s', (message, event) => {
    beforeAll(async () => {
        for (const record of event.Records) {
            const searchKeyValue = record.dynamodb.NewImage[SEARCH_KEY].S;
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
                            [SEARCH_KEY]: { S: searchKeyValue },
                            ConnectionId: { S: EXPECTED_CONNECTION_ID },
                            ConnectionEndpoint: {
                                S: EXPECTED_CONNECTION_ENDPOINT
                            }
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
            const searchKeyValue = record.dynamodb.NewImage[SEARCH_KEY].S;
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
            const searchKeyValue = record.dynamodb.NewImage[SEARCH_KEY].S;
            expect(apiGatewayCallsInputs).toContainEqual({
                ConnectionId: EXPECTED_CONNECTION_ID,
                Data: JSON.stringify({
                    [SEARCH_KEY]: { S: searchKeyValue }
                })
            });
        }
    });

    afterAll(() => {
        ddbMock.reset();
        apiMock.reset();
    });
});
