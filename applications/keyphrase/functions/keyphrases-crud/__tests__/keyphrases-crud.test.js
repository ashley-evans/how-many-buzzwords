const { StatusCodes } = require('http-status-codes');
const {
    DynamoDBClient,
    QueryCommand
} = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const TABLE_NAME = 'test';
const VALID_HOSTNAME = 'www.example.com';
const INVALID_METHOD = 'WIBBLE';

process.env.TABLE_NAME = TABLE_NAME;
process.env.ERROR_LOGGING_ENABLED = false;

const ddbMock = mockClient(DynamoDBClient);

const { handler, supportedMethods } = require('../keyphrases-crud');
const { keyPhraseTableKeyFields } = require('../constants');

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
            createEvent(undefined, VALID_HOSTNAME)
        ],
        [
            'valid url in other text',
            createEvent(supportedMethods.GET, `invalid ${VALID_HOSTNAME}`)
        ],
        [
            'invalid base URL parameter',
            createEvent(supportedMethods.GET, 'invalid base url')
        ],
        [
            'unsupported method',
            createEvent(INVALID_METHOD, VALID_HOSTNAME)
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
    describe.each([
        ['with http protocol', `http://${VALID_HOSTNAME}`],
        ['with https protocol', `https://${VALID_HOSTNAME}`],
        ['without a protocol', VALID_HOSTNAME]
    ])('given valid base URL with %s', (message, url) => {
        const expectedPathname = '/example';
        const expectedData = [
            {
                [keyPhraseTableKeyFields.HASH_KEY]: {
                    S: VALID_HOSTNAME
                },
                [keyPhraseTableKeyFields.SORT_KEY]: {
                    S: expectedPathname
                }
            }
        ];

        let response;
        let dynamoDbCallsInputs;

        beforeAll(async () => {
            ddbMock.on(QueryCommand).resolves({
                Items: expectedData
            });

            response = await handler(
                createEvent(supportedMethods.GET, url)
            );

            dynamoDbCallsInputs = ddbMock.calls()
                .map(call => call.args[0].input);
        });

        test('queries dynamodb with hostname component of URL', async () => {
            expect(dynamoDbCallsInputs).toHaveLength(1);
            expect(dynamoDbCallsInputs).toContainEqual({
                TableName: TABLE_NAME,
                KeyConditionExpression: '#baseUrl = :searchUrl',
                ExpressionAttributeNames: {
                    '#baseUrl': keyPhraseTableKeyFields.HASH_KEY
                },
                ExpressionAttributeValues: {
                    ':searchUrl': { S: VALID_HOSTNAME }
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
                createEvent(supportedMethods.GET, VALID_HOSTNAME)
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

    test(
        'returns not found error if no results are returned from dynamodb',
        async () => {
            ddbMock.on(QueryCommand).resolves({
                Items: []
            });

            const response = await handler(
                createEvent(supportedMethods.GET, VALID_HOSTNAME)
            );

            expect(response).toBeDefined();
            expect(response.body).not.toEqual(expect.anything());
            expect(response.statusCode).toEqual(
                StatusCodes.NOT_FOUND
            );
        }
    );
});

afterEach(() => {
    ddbMock.reset();
});
