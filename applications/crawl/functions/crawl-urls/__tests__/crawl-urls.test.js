const { readdirSync } = require('fs-extra');
const path = require('path');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');
const escapeRegExp = require('lodash.escaperegexp');

const localStorageEmulator = require('./helpers/local-storage-emulator');
const { mockURLFromFile } = require('../../../../../helpers/http-mock');
const { urlsTableKeyFields } = require('../constants');

const ENTRY_POINT_HOSTNAME = 'www.example.com';
const ENTRY_POINT_REGEX = new RegExp(escapeRegExp(ENTRY_POINT_HOSTNAME));
const EXTERNAL_URL_HOSTNAME = 'www.external-example.com';
const EXTERNAL_URL = `http://${EXTERNAL_URL_HOSTNAME}/`;

const LOCAL_STORAGE_DIR = path.join(__dirname, '/apify_storage/');
const ASSET_FOLDER = path.join(__dirname, '/assets/');
const DEPTH_FOLDER = path.join(ASSET_FOLDER, '/depth/');

const TABLE_NAME = 'test';
const MAX_REQUESTS_PER_CRAWL = 50;

process.env.TABLE_NAME = TABLE_NAME;
process.env.MAX_REQUESTS_PER_CRAWL = MAX_REQUESTS_PER_CRAWL;
process.env.MAX_CRAWL_DEPTH = 20;
process.env.ERROR_LOGGING_ENABLED = false;

const ddbMock = mockClient(DynamoDBClient);

const { handler } = require('../crawl-urls');

const createRecord = (url, depth) => {
    return {
        body: JSON.stringify({ url, depth }),
        eventSource: 'aws:sqs'
    };
};

const createEvent = (...records) => {
    return {
        Records: records
    };
};

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockURLFromFile(
        ENTRY_POINT_REGEX,
        '/',
        path.join(ASSET_FOLDER, 'entry-point.html'),
        true
    );
    mockURLFromFile(
        ENTRY_POINT_REGEX,
        '/sub-page-1',
        path.join(ASSET_FOLDER, 'sub-page-1.html'),
        true
    );

    await localStorageEmulator.init(LOCAL_STORAGE_DIR);
});

beforeEach(async () => {
    await localStorageEmulator.clean();
    ddbMock.reset();
});

describe('input validation', () => {
    test.each([
        [
            'record with invalid JSON body',
            createEvent({ body: 'test test', eventSource: 'aws:sqs' })
        ],
        [
            'record with missing url',
            createEvent(createRecord(undefined, 20))
        ],
        [
            'record with valid url in other text',
            createEvent(createRecord(`invalid ${ENTRY_POINT_HOSTNAME}`))
        ],
        [
            'record with invalid url (numeric)',
            createEvent(createRecord(20))
        ],
        [
            'record with invalid depth',
            createEvent(createRecord(ENTRY_POINT_HOSTNAME, 'test'))
        ]
    ])('handler rejects %s', async (message, event) => {
        ddbMock.on(PutItemCommand).resolves();

        const response = await handler(event);

        expect(response.body).toEqual('Event object failed validation');
        expect(response.headers['Content-Type']).toEqual('text/plain');
        expect(response.statusCode).toEqual(400);
    });
});

describe.each([
    ['with http protocol', `http://${ENTRY_POINT_HOSTNAME}`],
    ['with https protocol', `https://${ENTRY_POINT_HOSTNAME}`],
    ['without a protocol', ENTRY_POINT_HOSTNAME]
])('given valid url %s', (message, url) => {
    let event;

    beforeAll(async () => {
        event = createEvent(createRecord(url));
        ddbMock.on(PutItemCommand).resolves();
    });

    test('handler returns success', async () => {
        const response = await handler(event);

        expect(response.statusCode).toEqual(200);
    });

    test(
        'handler inserts all path names accessible from base url to dynamo',
        async () => {
            await handler(event);

            const dynamoDbCallsArguments = ddbMock.calls().map(
                call => call.args
            );

            expect(dynamoDbCallsArguments).toHaveLength(2);
            for (const index in dynamoDbCallsArguments) {
                expect(dynamoDbCallsArguments[index]).toHaveLength(1);
            }

            const dynamoDbArgumentInputs = dynamoDbCallsArguments
                .map(args => args[0].input);
            expect(dynamoDbArgumentInputs).toContainEqual({
                TableName: TABLE_NAME,
                Item: {
                    [urlsTableKeyFields.HASH_KEY]: {
                        S: ENTRY_POINT_HOSTNAME
                    },
                    [urlsTableKeyFields.SORT_KEY]: {
                        S: '/'
                    }
                }
            });
            expect(dynamoDbArgumentInputs).toContainEqual({
                TableName: TABLE_NAME,
                Item: {
                    [urlsTableKeyFields.HASH_KEY]: {
                        S: ENTRY_POINT_HOSTNAME
                    },
                    [urlsTableKeyFields.SORT_KEY]: {
                        S: '/sub-page-1'
                    }
                }
            });
        }
    );
});

test(
    'handler only inserts one entry to dynamo db when page refers to itself',
    async () => {
        mockURLFromFile(
            ENTRY_POINT_REGEX,
            '/circle',
            path.join(ASSET_FOLDER, 'circle.html'),
            true
        );
        const event = createEvent(
            createRecord(`${ENTRY_POINT_HOSTNAME}/circle`)
        );
        ddbMock.on(PutItemCommand).resolves();

        await handler(event);
        const dynamoDbCallsArguments = ddbMock.calls().map(call => call.args);

        expect(dynamoDbCallsArguments).toHaveLength(1);
        expect(dynamoDbCallsArguments[0]).toHaveLength(1);

        const dynamoDbArgumentInputs = dynamoDbCallsArguments
            .map(args => args[0].input);
        expect(dynamoDbArgumentInputs[0]).toEqual({
            TableName: TABLE_NAME,
            Item: {
                [urlsTableKeyFields.HASH_KEY]: {
                    S: `${ENTRY_POINT_HOSTNAME}/circle`
                },
                [urlsTableKeyFields.SORT_KEY]: {
                    S: '/circle'
                }
            }
        });
    }
);

test(
    'handler only inserts one entry to dynamo when page refers to another ' +
    'domain',
    async () => {
        mockURLFromFile(
            ENTRY_POINT_REGEX,
            '/external',
            path.join(ASSET_FOLDER, 'external.html'),
            false
        );
        mockURLFromFile(
            new RegExp(escapeRegExp(EXTERNAL_URL)),
            '/',
            path.join(ASSET_FOLDER, 'external.html'),
            false
        );
        const event = createEvent(
            createRecord(`${ENTRY_POINT_HOSTNAME}/external`)
        );
        ddbMock.on(PutItemCommand).resolves();

        await handler(event);
        const dynamoDbCallsArguments = ddbMock.calls().map(call => call.args);

        expect(dynamoDbCallsArguments).toHaveLength(1);
        expect(dynamoDbCallsArguments[0]).toHaveLength(1);

        const dynamoDbArgumentInputs = dynamoDbCallsArguments
            .map(args => args[0].input);
        expect(dynamoDbArgumentInputs[0]).toEqual({
            TableName: TABLE_NAME,
            Item: {
                [urlsTableKeyFields.HASH_KEY]: {
                    S: `${ENTRY_POINT_HOSTNAME}/external`
                },
                [urlsTableKeyFields.SORT_KEY]: {
                    S: '/external'
                }
            }
        });
    }
);

describe('depth', () => {
    beforeAll(() => {
        readdirSync(DEPTH_FOLDER).forEach(file => {
            const fileName = file.split('.')[0];
            mockURLFromFile(
                ENTRY_POINT_REGEX,
                `/${fileName}`,
                path.join(DEPTH_FOLDER, file),
                true
            );
        });

        ddbMock.on(PutItemCommand).resolves();
    });

    test('handler defaults to only crawl to maximum depth', async () => {
        const event = createEvent(
            createRecord(`${ENTRY_POINT_HOSTNAME}/depth-0`)
        );

        await handler(event);
        const dynamoDbCalls = ddbMock.calls();

        expect(dynamoDbCalls).toHaveLength(
            parseInt(process.env.MAX_CRAWL_DEPTH) + 1
        );
    });

    test(
        `handler crawls to specified depth (less than max) for a given starting
         point`,
        async () => {
            const expectedDepth = 10;
            const event = createEvent(
                createRecord(`${ENTRY_POINT_HOSTNAME}/depth-0`, expectedDepth)
            );

            await handler(event);
            const dynamoDbCalls = ddbMock.calls();

            expect(dynamoDbCalls).toHaveLength(expectedDepth + 1);
        }
    );

    test(
        'handler crawls to maximum depth given larger specified depth',
        async () => {
            const expectedDepth = process.env.MAX_CRAWL_DEPTH + 10;
            const event = createEvent(
                createRecord(`${ENTRY_POINT_HOSTNAME}/depth-0`, expectedDepth)
            );

            await handler(event);
            const dynamoDbCalls = ddbMock.calls();

            expect(dynamoDbCalls).toHaveLength(
                parseInt(process.env.MAX_CRAWL_DEPTH) + 1
            );
        }
    );
});

describe('max request', () => {
    const EXPECTED_MAX_REQUESTS = 5;

    beforeAll(() => {
        // Set to lower value for testing
        process.env.MAX_REQUESTS_PER_CRAWL = EXPECTED_MAX_REQUESTS;
        ddbMock.on(PutItemCommand).resolves();
    });

    test(
        `handler defaults to crawl to maximum number of pages for a single
         record`
        , async () => {
            const event = createEvent(
                createRecord(`${ENTRY_POINT_HOSTNAME}/depth-0`)
            );

            await handler(event);
            const dynamoDbCalls = ddbMock.calls();

            expect(dynamoDbCalls).toHaveLength(EXPECTED_MAX_REQUESTS);
        }
    );

    test('handler crawls to max number of pages per record', async () => {
        const firstRecordLowerBound = 0;
        const secondRecordLowerBound = 10;
        const event = createEvent(
            createRecord(
                `${ENTRY_POINT_HOSTNAME}/depth-${firstRecordLowerBound}`
            ),
            createRecord(
                `${ENTRY_POINT_HOSTNAME}/depth-${secondRecordLowerBound}`
            )
        );

        await handler(event);
        const dynamoDbCallsArguments = ddbMock.calls().map(call => call.args);

        expect(dynamoDbCallsArguments).toHaveLength(
            EXPECTED_MAX_REQUESTS * event.Records.length
        );

        /* Ensure that equal number of crawl operations have been performed for
           each record */
        const dynamoDbArgumentInputs = dynamoDbCallsArguments
            .map(args => args[0].input);
        for (let i = 0; i < EXPECTED_MAX_REQUESTS; i++) {
            const firstRecordIndex = i + firstRecordLowerBound;
            expect(dynamoDbArgumentInputs).toContainEqual({
                TableName: TABLE_NAME,
                Item: {
                    [urlsTableKeyFields.HASH_KEY]: {
                        S: `${ENTRY_POINT_HOSTNAME}/depth-` +
                            firstRecordLowerBound.toString()
                    },
                    [urlsTableKeyFields.SORT_KEY]: {
                        S: `/depth-${firstRecordIndex}`
                    }
                }
            });
            const secondRecordIndex = i + secondRecordLowerBound;
            expect(dynamoDbArgumentInputs).toContainEqual({
                TableName: TABLE_NAME,
                Item: {
                    [urlsTableKeyFields.HASH_KEY]: {
                        S: `${ENTRY_POINT_HOSTNAME}/depth-` +
                            secondRecordLowerBound.toString()
                    },
                    [urlsTableKeyFields.SORT_KEY]: {
                        S: `/depth-${secondRecordIndex}`
                    }
                }
            });
        }
    });

    afterAll(() => {
        // Reset to previous value
        process.env.MAX_REQUESTS_PER_CRAWL = MAX_REQUESTS_PER_CRAWL;
    });
});

afterAll(async () => {
    await localStorageEmulator.destroy();
});
