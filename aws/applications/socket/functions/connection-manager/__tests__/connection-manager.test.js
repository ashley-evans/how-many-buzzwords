const { handler } = require('../connection-manager');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const { CONNECT_ROUTE_KEY, DISCONNECT_ROUTE_KEY } = require('../constants');

const EXPECTED_CONNECTION_ID = 'Gyvd8cAwLPECHlQ=';
const EXPECTED_DOMAIN_NAME = 'test.test.com';
const EXPECTED_STAGE = 'test';

const TABLE_NAME = 'test';
process.env.TABLE_NAME = TABLE_NAME;

const ddbMock = mockClient(DynamoDBClient);

const createEvent = (connectionId, domainName, stage, routeKey) => {
    return {
        requestContext: {
            connectionId,
            domainName,
            stage,
            routeKey
        }
    };
};

beforeEach(() => {
    ddbMock.reset();
});

describe('input validation', () => {
    test.each([
        ['event with missing requestContext', {}],
        ['event with non-object requestContext', { requestContext: '' }],
        [
            'requestContext with missing connectionId',
            createEvent(
                undefined,
                EXPECTED_DOMAIN_NAME,
                EXPECTED_STAGE,
                CONNECT_ROUTE_KEY
            )
        ],
        [
            'requestContext with missing domainName',
            createEvent(
                EXPECTED_CONNECTION_ID,
                undefined,
                EXPECTED_STAGE,
                CONNECT_ROUTE_KEY
            )
        ],
        [
            'requestContext with invalid domainName',
            createEvent(
                EXPECTED_CONNECTION_ID,
                'not a domain',
                EXPECTED_STAGE,
                CONNECT_ROUTE_KEY
            )
        ],
        [
            'requestContext with missing stage',
            createEvent(
                EXPECTED_CONNECTION_ID,
                EXPECTED_DOMAIN_NAME,
                undefined,
                CONNECT_ROUTE_KEY
            )
        ],
        [
            'requestContext with missing routeKey',
            createEvent(
                EXPECTED_CONNECTION_ID,
                EXPECTED_DOMAIN_NAME,
                EXPECTED_STAGE,
                undefined
            )
        ]
    ])('returns failed validation error given event with %s',
        async (message, input) => {
            await expect(handler(input)).rejects.toThrowError(
                'Event object failed validation'
            );
        }
    );
});

describe('incoming connect event', () => {
    test('stores connection id and endpoint in DynamoDB table', async () => {
        const event = createEvent(
            EXPECTED_CONNECTION_ID,
            EXPECTED_DOMAIN_NAME,
            EXPECTED_STAGE,
            CONNECT_ROUTE_KEY
        );
        const expectedEndpoint =
            `https://${EXPECTED_DOMAIN_NAME}/${EXPECTED_STAGE}`;

        await handler(event);
        const dynamoDbCallsInputs = ddbMock.calls()
            .map(call => call.args[0].input);

        expect(dynamoDbCallsInputs).toHaveLength(1);
        expect(dynamoDbCallsInputs).toContainEqual({
            TableName: TABLE_NAME,
            Item: {
                ConnectionId: EXPECTED_CONNECTION_ID,
                ConnectionEndpoint: expectedEndpoint
            }
        });
    });
});

describe('incoming disconnect event', () => {
    test(
        'does not store connection id and endpoint in DynamoDB table',
        async () => {
            const event = createEvent(
                EXPECTED_CONNECTION_ID,
                EXPECTED_DOMAIN_NAME,
                EXPECTED_STAGE,
                DISCONNECT_ROUTE_KEY
            );

            await handler(event);
            const dynamoDbCalls = ddbMock.calls();

            expect(dynamoDbCalls).toHaveLength(0);
        }
    );
});
