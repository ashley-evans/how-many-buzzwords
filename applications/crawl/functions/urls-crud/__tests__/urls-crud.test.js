const { StatusCodes } = require('http-status-codes');
const {
    DynamoDBClient,
    QueryCommand
} = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const TABLE_NAME = 'test';
const VALID_URL = 'http://example.com/';
const INVALID_METHOD = 'WIBBLE';

process.env.TABLE_NAME = TABLE_NAME;
process.env.ERROR_LOGGING_ENABLED = false;

const ddbMock = mockClient(DynamoDBClient);

const { handler, supportedMethods } = require('../urls-crud');
const { urlsTableKeyFields } = require('../constants');

const createEvent = (httpMethod, baseUrl) => {
    return {
        httpMethod,
        pathParameters: {
            baseUrl
        }
    };
};

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('input validation', () => {
    test.each([
        [
            'missing http method',
            createEvent(undefined, VALID_URL)
        ],
        [
            'invalid base URL parameter',
            createEvent(supportedMethods.GET, 'invalid base url')
        ],
        [
            'unsupported method',
            createEvent(INVALID_METHOD, VALID_URL)
        ]
    ])('returns bad request error given %s',
        async (message, input) => {
            const response = await handler(input);
            expect(response).toBeDefined();
            expect(response.body).toEqual('Event object failed validation');
            expect(response.headers).toEqual({
                'Content-Type': 'text/plain'
            });
            expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
        }
    );
});

describe('GET route', () => {
    describe('Happy path', () => {
        const expectedChildUrl = `${VALID_URL}/example`;
        const expectedData = [
            {
                [urlsTableKeyFields.HASH_KEY]: {
                    S: VALID_URL
                },
                [urlsTableKeyFields.SORT_KEY]: {
                    S: expectedChildUrl
                }
            }
        ];

        let response;

        beforeAll(async () => {
            ddbMock.on(QueryCommand).resolves({
                Items: expectedData
            });

            response = await handler(
                createEvent(supportedMethods.GET, VALID_URL)
            );
        });

        test('queries dynamodb with provided base URL parameter', async () => {
            const dynamoDbCallsInputs = ddbMock.calls()
                .map(call => call.args[0].input);

            expect(dynamoDbCallsInputs).toHaveLength(1);
            expect(dynamoDbCallsInputs).toContainEqual({
                TableName: TABLE_NAME,
                KeyConditionExpression: '#baseUrl = :searchUrl',
                ExpressionAttributeNames: {
                    '#baseUrl': urlsTableKeyFields.HASH_KEY
                },
                ExpressionAttributeValues: {
                    ':searchUrl': { S: VALID_URL }
                }
            });
        });

        test(
            'returns results provided by dynamodb in ok response',
            async () => {
                expect(response).toBeDefined();
                expect(response.body).toEqual(JSON.stringify(expectedData));
                expect(response.headers).toEqual({
                    'Content-Type': 'application/json'
                });
                expect(response.statusCode).toEqual(StatusCodes.OK);
            }
        );
    });

    test(
        'returns internal server error if error thrown during dynamodb call',
        async () => {
            const expectedErrorMessage = 'Test Error';
            ddbMock.rejects(expectedErrorMessage);

            const response = await handler(
                createEvent(supportedMethods.GET, VALID_URL)
            );

            expect(response).toBeDefined();
            expect(response.body).toEqual(expectedErrorMessage);
            expect(response.headers).toEqual({
                'Content-Type': 'text/plain'
            });
            expect(response.statusCode).toEqual(
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    );
});

afterEach(() => {
    ddbMock.reset();
});
