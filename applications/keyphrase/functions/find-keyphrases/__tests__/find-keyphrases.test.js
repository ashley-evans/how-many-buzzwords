const { handler } = require('../find-keyphrases');
const path = require('path');
const {
    DynamoDBClient,
    QueryCommand
} = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const { mockURLFromFile } = require('../../../../../helpers/http-mock');
const {
    keyPhraseTableKeyFields,
    keyPhraseTableNonKeyFields,
    urlsTableKeyFields
} = require('../constants');

const TABLE_NAME = 'test';
process.env.TABLE_NAME = TABLE_NAME;

const ddbMock = mockClient(DynamoDBClient);

const createEvent = (...records) => {
    return {
        Records: records
    };
};
const createRecord = (baseUrl, pathname) => {
    return {
        body: JSON.stringify({
            [urlsTableKeyFields.HASH_KEY]: baseUrl,
            [urlsTableKeyFields.SORT_KEY]: pathname
        }),
        eventSource: 'aws:sqs'
    };
};

const EXPECTED_BASE_URL = 'www.test.com';
const EXPECTED_VALID_URL = `http://${EXPECTED_BASE_URL}`;
const EXPECTED_PATHNAME = '/term-extraction';
const ASSET_FOLDER = path.join(__dirname, '/assets/');

beforeEach(() => {
    ddbMock.reset();
});

describe('input validation', () => {
    test.each([
        ['event with no records', {}],
        ['record with missing body', createEvent({})],
        ['record with non-object body', createEvent({ body: 'test' })],
        [
            'record with missing BaseUrl value',
            createEvent(createRecord(undefined, EXPECTED_PATHNAME))
        ],
        [
            'record with missing Pathname value',
            createEvent(createRecord(EXPECTED_BASE_URL, undefined))
        ],
        [
            'record with BaseUrl with http protocol',
            createEvent(
                createRecord(`http://${EXPECTED_BASE_URL}`, EXPECTED_PATHNAME)
            )
        ],
        [
            'record with BaseUrl with https protocol',
            createEvent(
                createRecord(`https://${EXPECTED_BASE_URL}`, EXPECTED_PATHNAME)
            )
        ],
        [
            'record with invalid BaseUrl value',
            createEvent(createRecord('not a url', EXPECTED_PATHNAME))
        ],
        [
            'record with invalid Pathname value',
            createEvent(createRecord(EXPECTED_BASE_URL, 'not a pathname'))
        ]
    ])('returns failed validation error given %s',
        async (message, input) => {
            await expect(handler(input)).rejects.toThrowError(
                'Event object failed validation'
            );
        });
});

describe.each([
    ['without a pathname', EXPECTED_BASE_URL],
    ['with a pathname', `${EXPECTED_BASE_URL}${EXPECTED_PATHNAME}`]
])('given valid url %s', (message, url) => {
    test.each([
        [
            'a single pathname',
            [
                {
                    pathname: EXPECTED_PATHNAME,
                    assetPath: 'term-extraction.html'
                }
            ]
        ],
        [
            'multiple pathnames',
            [
                {
                    pathname: EXPECTED_PATHNAME,
                    assetPath: 'term-extraction.html'
                },
                {
                    pathname: '/empty',
                    assetPath: 'empty.html'
                }
            ]
        ]
    ])(
        'handler call expected base url at all provided pathnames given %s',
        async (message, routeDetails) => {
            const mockURLs = [];
            const records = [];
            for (let i = 0; i < routeDetails.length; i++) {
                const currentRouteDetails = routeDetails[i];
                const mockURL = mockURLFromFile(
                    EXPECTED_VALID_URL,
                    currentRouteDetails.pathname,
                    path.join(ASSET_FOLDER, currentRouteDetails.assetPath),
                    false
                );
                mockURLs.push(mockURL);

                records.push(
                    createRecord(
                        url,
                        currentRouteDetails.pathname
                    )
                );
            }

            await handler(createEvent(...records));

            for (let i = 0; i < mockURLs.length; i++) {
                expect(mockURLs[i].isDone()).toBeTruthy();
            }
        }
    );
});

describe('keyphrase extraction', () => {
    test.each([
        [
            'a page with content',
            EXPECTED_PATHNAME,
            'term-extraction.html',
            [
                { phrase: 'term', occurences: 3 },
                { phrase: 'extraction', occurences: 7 },
                { phrase: 'terminology', occurences: 4 },
                { phrase: 'web', occurences: 4 },
                { phrase: 'domain', occurences: 6 },
                { phrase: 'terminology extraction', occurences: 3 },
                { phrase: 'terms', occurences: 4 },
                { phrase: 'term extraction', occurences: 2 },
                { phrase: 'knowledge domain', occurences: 2 },
                { phrase: 'communities', occurences: 2 }
            ]
        ],
        [
            'a page with no content',
            '/empty',
            'empty.html',
            []
        ]
    ])('stores keyphrase occurences to base URL entry in DynamoDB for %s',
        async (message, pathname, assetPath, expectedOccurences) => {
            mockURLFromFile(
                EXPECTED_VALID_URL,
                pathname,
                path.join(ASSET_FOLDER, assetPath),
                false
            );

            await handler(
                createEvent(createRecord(EXPECTED_BASE_URL, pathname))
            );
            const dynamoDbCallsArguments = ddbMock.calls()
                .map(call => call.args);

            // Should call Query once and PutItem for each occurence
            expect(dynamoDbCallsArguments).toHaveLength(
                expectedOccurences.length + 1
            );

            const dynamoDbArgumentInputs = dynamoDbCallsArguments
                .map(args => args[0].input);

            for (const expectedOccurence of expectedOccurences) {
                expect(dynamoDbArgumentInputs).toContainEqual({
                    TableName: TABLE_NAME,
                    Item: {
                        [keyPhraseTableKeyFields.HASH_KEY]: {
                            S: EXPECTED_BASE_URL
                        },
                        [keyPhraseTableKeyFields.SORT_KEY]: {
                            S: expectedOccurence.phrase
                        },
                        [keyPhraseTableNonKeyFields.OCCURENCES_FIELD]: {
                            N: expectedOccurence.occurences.toString()
                        }
                    }
                });
            }
        });
});

describe('previous keyphrase occurences', () => {
    beforeEach(() => {
        mockURLFromFile(
            EXPECTED_VALID_URL,
            EXPECTED_PATHNAME,
            path.join(ASSET_FOLDER, 'term-extraction.html'),
            false
        );
    });

    test('calls dynamodb to get previous keyphrases for URL', async () => {
        await handler(
            createEvent(createRecord(EXPECTED_BASE_URL, EXPECTED_PATHNAME))
        );
        const dynamoDbCallsInputs = ddbMock.calls()
            .map(call => call.args[0].input);

        expect(dynamoDbCallsInputs).toContainEqual({
            TableName: TABLE_NAME,
            KeyConditionExpression: '#url = :searchUrl',
            ExpressionAttributeNames: {
                '#url': keyPhraseTableKeyFields.HASH_KEY
            },
            ExpressionAttributeValues: {
                ':searchUrl': { S: EXPECTED_BASE_URL }
            },
            ProjectionExpression: keyPhraseTableKeyFields.SORT_KEY +
                `,${keyPhraseTableNonKeyFields.OCCURENCES_FIELD}`
        });
    });

    test.each([
        ['is a keyword on current page', 'term', 3],
        ['not a keyword on current page', 'first', 2]
    ])(
        'updates dynamodb if previous keyword exists on page and %s',
        async (message, previousKeyPhrase, expectedOccurences) => {
            const previousOccurences = 5;

            ddbMock
                .on(QueryCommand, {
                    TableName: TABLE_NAME,
                    KeyConditionExpression: '#url = :searchUrl',
                    ExpressionAttributeNames: {
                        '#url': keyPhraseTableKeyFields.HASH_KEY
                    },
                    ExpressionAttributeValues: {
                        ':searchUrl': { S: EXPECTED_BASE_URL }
                    },
                    ProjectionExpression: keyPhraseTableKeyFields.SORT_KEY +
                        `,${keyPhraseTableNonKeyFields.OCCURENCES_FIELD}`
                })
                .resolves({
                    Items: [
                        {
                            [keyPhraseTableKeyFields.SORT_KEY]: {
                                S: previousKeyPhrase
                            },
                            [keyPhraseTableNonKeyFields.OCCURENCES_FIELD]: {
                                N: previousOccurences.toString()
                            }
                        }
                    ]
                });

            await handler(
                createEvent(createRecord(EXPECTED_BASE_URL, EXPECTED_PATHNAME))
            );
            const dynamoDbCallsInputs = ddbMock.calls()
                .map(call => call.args[0].input);

            expect(dynamoDbCallsInputs).toContainEqual({
                TableName: TABLE_NAME,
                Item: {
                    [keyPhraseTableKeyFields.HASH_KEY]: {
                        S: EXPECTED_BASE_URL
                    },
                    [keyPhraseTableKeyFields.SORT_KEY]: {
                        S: previousKeyPhrase
                    },
                    [keyPhraseTableNonKeyFields.OCCURENCES_FIELD]: {
                        N: (previousOccurences + expectedOccurences).toString()
                    }
                }
            });
        }
    );

    test(
        'doesn\'t update dynamodb if previous keyword doesn\'t exist on page',
        async () => {
            const previousKeyPhrase = 'wibble';
            const previousOccurences = '5';

            ddbMock
                .on(QueryCommand, {
                    TableName: TABLE_NAME,
                    KeyConditionExpression: '#url = :searchUrl',
                    ExpressionAttributeNames: {
                        '#url': keyPhraseTableKeyFields.HASH_KEY
                    },
                    ExpressionAttributeValues: {
                        ':searchUrl': { S: EXPECTED_BASE_URL }
                    },
                    ProjectionExpression: keyPhraseTableKeyFields.SORT_KEY +
                        `,${keyPhraseTableNonKeyFields.OCCURENCES_FIELD}`
                })
                .resolves({
                    Items: [
                        {
                            [keyPhraseTableKeyFields.SORT_KEY]: {
                                S: previousKeyPhrase
                            },
                            [keyPhraseTableNonKeyFields.OCCURENCES_FIELD]: {
                                N: previousOccurences
                            }
                        }
                    ]
                });

            await handler(
                createEvent(createRecord(EXPECTED_BASE_URL, EXPECTED_PATHNAME))
            );
            const dynamoDbCallsInputs = ddbMock.calls()
                .map(call => call.args[0].input);

            expect(dynamoDbCallsInputs).not.toContainEqual({
                TableName: TABLE_NAME,
                Item: {
                    [keyPhraseTableKeyFields.HASH_KEY]: {
                        S: EXPECTED_BASE_URL
                    },
                    [keyPhraseTableKeyFields.SORT_KEY]: {
                        S: previousKeyPhrase
                    },
                    [keyPhraseTableNonKeyFields.OCCURENCES_FIELD]: {
                        N: previousOccurences
                    }
                }
            });
        }
    );
});
