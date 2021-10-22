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
    keyPhraseTableNonKeyFields
} = require('../constants');

const TABLE_NAME = 'test';
process.env.TABLE_NAME = TABLE_NAME;

const ddbMock = mockClient(DynamoDBClient);

const createEvent = (...records) => {
    return {
        Records: records
    };
};
const createRecord = (baseUrl, childUrl) => {
    return {
        body: JSON.stringify({ baseUrl, childUrl }),
        eventSource: 'aws:sqs'
    };
};

const createChildURL = (baseUrl, childRoute) => {
    return `${baseUrl}${childRoute}`;
};

const EXPECTED_BASE_URL = 'http://www.test.com';
const EXPECTED_CHILD_ROUTE = '/term-extraction';
const ASSET_FOLDER = path.join(__dirname, '/assets/');
const EXPECTED_CHILD_URL = createChildURL(
    EXPECTED_BASE_URL,
    EXPECTED_CHILD_ROUTE
);

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
            createEvent(createRecord(undefined, EXPECTED_CHILD_URL))
        ],
        [
            'record with missing ChildUrl value',
            createEvent(createRecord(EXPECTED_BASE_URL, undefined))
        ],
        [
            'record with invalid BaseUrl value',
            createEvent(createRecord('not a url', EXPECTED_CHILD_URL))
        ],
        [
            'record with invalid ChildUrl value',
            createEvent(createRecord(EXPECTED_BASE_URL, 'not a url'))
        ]
    ])('returns failed validation error given %s',
        async (message, input) => {
            await expect(handler(input)).rejects.toThrowError(
                'Event object failed validation'
            );
        });
});

test.each([
    [
        'a single record',
        [
            {
                childRoute: EXPECTED_CHILD_ROUTE,
                assetPath: 'term-extraction.html'
            }
        ]
    ],
    [
        'multiple records',
        [
            {
                childRoute: EXPECTED_CHILD_ROUTE,
                assetPath: 'term-extraction.html'
            },
            {
                childRoute: '/empty',
                assetPath: 'empty.html'
            }
        ]
    ]
])('handler call expected url(s) given %s', async (message, routeDetails) => {
    const mockURLs = [];
    const records = [];
    for (let i = 0; i < routeDetails.length; i++) {
        const currentRouteDetails = routeDetails[i];
        const mockURL = mockURLFromFile(
            EXPECTED_BASE_URL,
            currentRouteDetails.childRoute,
            path.join(ASSET_FOLDER, currentRouteDetails.assetPath),
            false
        );
        mockURLs.push(mockURL);

        const childURL = createChildURL(
            EXPECTED_BASE_URL,
            currentRouteDetails.childRoute
        );
        records.push(createRecord(EXPECTED_BASE_URL, childURL));
    }

    await handler(createEvent(...records));

    for (let i = 0; i < mockURLs.length; i++) {
        expect(mockURLs[i].isDone()).toBeTruthy();
    }
});

describe('keyphrase extraction', () => {
    test.each([
        [
            'a page with content',
            EXPECTED_CHILD_ROUTE,
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
        async (message, childRoute, assetPath, expectedOccurences) => {
            mockURLFromFile(
                EXPECTED_BASE_URL,
                childRoute,
                path.join(ASSET_FOLDER, assetPath),
                false
            );

            const childURL = createChildURL(EXPECTED_BASE_URL, childRoute);
            await handler(
                createEvent(createRecord(EXPECTED_BASE_URL, childURL))
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
            EXPECTED_BASE_URL,
            EXPECTED_CHILD_ROUTE,
            path.join(ASSET_FOLDER, 'term-extraction.html'),
            false
        );
    });

    test('calls dynamodb to get previous keyphrases for URL', async () => {
        await handler(
            createEvent(createRecord(EXPECTED_BASE_URL, EXPECTED_CHILD_URL))
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
                createEvent(createRecord(EXPECTED_BASE_URL, EXPECTED_CHILD_URL))
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
                createEvent(createRecord(EXPECTED_BASE_URL, EXPECTED_CHILD_URL))
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
