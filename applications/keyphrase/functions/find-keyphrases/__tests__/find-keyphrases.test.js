const { handler } = require('../find-keyphrases');
const path = require('path');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const { mockURLFromFile } = require('../../../../../helpers/http-mock');
const { keyPhraseTableKeyFields } = require('../constants');

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
                { phrase: 'term', occurances: 3 },
                { phrase: 'extraction', occurances: 7 },
                { phrase: 'terminology', occurances: 4 },
                { phrase: 'web', occurances: 4 },
                { phrase: 'domain', occurances: 6 },
                { phrase: 'terminology extraction', occurances: 3 },
                { phrase: 'terms', occurances: 4 },
                { phrase: 'term extraction', occurances: 2 },
                { phrase: 'knowledge domain', occurances: 2 },
                { phrase: 'communities', occurances: 2 }
            ]
        ],
        [
            'a page with no content',
            '/empty',
            'empty.html',
            []
        ]
    ])('stores keyphrase occurances to base URL entry in DynamoDB for %s',
        async (message, childRoute, assetPath, expectedOccurances) => {
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

            // Should call GetItem and PutItem for each occurance
            expect(dynamoDbCallsArguments).toHaveLength(
                expectedOccurances.length * 2
            );

            const dynamoDbArgumentInputs = dynamoDbCallsArguments
                .map(args => args[0].input);

            for (const expectedOccurance of expectedOccurances) {
                expect(dynamoDbArgumentInputs).toContainEqual({
                    TableName: TABLE_NAME,
                    Item: {
                        [keyPhraseTableKeyFields.HASH_KEY]: {
                            S: EXPECTED_BASE_URL
                        },
                        [keyPhraseTableKeyFields.SORT_KEY]: {
                            S: expectedOccurance.phrase
                        },
                        Occurances: {
                            N: expectedOccurance.occurances.toString()
                        }
                    }
                });
            }
        });
});

test('updates keyphrase occurrance if already exists', async () => {
    mockURLFromFile(
        EXPECTED_BASE_URL,
        EXPECTED_CHILD_ROUTE,
        path.join(ASSET_FOLDER, 'term-extraction.html'),
        false
    );

    const previousPhrase = 'term';
    const expectedPrevious = 5;
    ddbMock
        .on(GetItemCommand, {
            TableName: TABLE_NAME,
            Key: {
                [keyPhraseTableKeyFields.HASH_KEY]: { S: EXPECTED_BASE_URL },
                [keyPhraseTableKeyFields.SORT_KEY]: { S: previousPhrase }
            },
            ProjectionExpression: 'Occurances'
        })
        .resolves({
            Item: {
                Occurances: {
                    N: expectedPrevious
                }
            }
        });

    await handler(
        createEvent(createRecord(EXPECTED_BASE_URL, EXPECTED_CHILD_URL))
    );

    const dynamoDbArgumentInputs = ddbMock.calls()
        .map(call => call.args[0].input);
    expect(dynamoDbArgumentInputs).toContainEqual({
        TableName: TABLE_NAME,
        Item: {
            [keyPhraseTableKeyFields.HASH_KEY]: { S: EXPECTED_BASE_URL },
            [keyPhraseTableKeyFields.SORT_KEY]: { S: previousPhrase },
            Occurances: { N: (expectedPrevious + 3).toString() }
        }
    });
});
