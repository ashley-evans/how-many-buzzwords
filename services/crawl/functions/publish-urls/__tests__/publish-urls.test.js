const {
    EventBridgeClient,
    PutEventsCommand
} = require('@aws-sdk/client-eventbridge');
const { mockClient } = require('aws-sdk-client-mock');

const {
    URLsTableKeyFields
} = require('buzzword-aws-crawl-common');

const mockEventBridgeClient = mockClient(EventBridgeClient);

const EXPECTED_BASE_URL = 'www.test.com';
const EXPECTED_PATHNAME = '/test';

process.env.EVENT_BUS_ARN = 'test:arn';

const { handler } = require('../publish-urls');

const createRecord = (baseUrl, pathname) => {
    return {
        dynamodb: {
            NewImage: {
                [URLsTableKeyFields.HashKey]: {
                    S: baseUrl
                },
                [URLsTableKeyFields.SortKey]: {
                    S: pathname
                }
            }
        },
        eventSource: 'aws:dynamodb'
    };
};

const createEvent = (...records) => {
    return {
        Records: records
    };
};

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('input validation', () => {
    test.each([
        [
            'event with no records',
            {}
        ],
        [
            'record with no DynamoDB field',
            createEvent({})
        ],
        [
            'record with non-object DynamoDB field',
            createEvent({ dynamodb: 'test' })
        ],
        [
            'record with missing NewImage field',
            createEvent({ dynamodb: {} })
        ],
        [
            'record with non-object NewImage field',
            createEvent({ dynamodb: { Newimage: 'test' } })
        ],
        [
            'record with missing BaseUrl field',
            createEvent({ dynamodb: { NewImage: { Pathname: {} } } })
        ],
        [
            'record with non-object BaseUrl field',
            createEvent(
                { dynamodb: { NewImage: { BaseUrl: 'test', Pathname: {} } } }
            )
        ],
        [
            'record with missing Pathname field',
            createEvent({ dynamodb: { NewImage: { BaseUrl: {} } } })
        ],
        [
            'record with non-object Pathname field',
            createEvent(
                { dynamodb: { NewImage: { BaseUrl: {}, Pathname: 'test' } } }
            )
        ],
        [
            'record with missing BaseUrl value',
            createEvent(createRecord(undefined, EXPECTED_PATHNAME))
        ],
        [
            'record with missing Pathname value',
            createEvent(createRecord(EXPECTED_BASE_URL, undefined))
        ],
        [
            'record with valid BaseUrl in other text',
            createEvent(
                createRecord(`invalid ${EXPECTED_BASE_URL}`, EXPECTED_PATHNAME)
            )
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
        }
    );
});

describe.each([
    [
        'a single stream item',
        [
            {
                baseURL: EXPECTED_BASE_URL,
                pathname: '/'
            }
        ]
    ],
    [
        'multiple stream items',
        [
            {
                baseURL: EXPECTED_BASE_URL,
                pathname: '/'
            },
            {
                baseURL: EXPECTED_BASE_URL,
                pathname: '/test'
            }
        ]
    ]
])('publishes to Event bus given %s', (message, items) => {
    let commands;
    let entries;

    beforeAll(async () => {
        mockEventBridgeClient.reset();
        mockEventBridgeClient.on(PutEventsCommand).resolves();

        const records = items.map(
            item => createRecord(item.baseURL, item.pathname)
        );

        await handler(createEvent(...records));

        commands = mockEventBridgeClient.commandCalls(PutEventsCommand);
        entries = commands.map(command => command.args[0].input.Entries).flat();
    });

    test('sends an put event command entry per item', () => {
        expect(commands).toHaveLength(1);
        expect(entries).toHaveLength(items.length);
    });
    
    test('sends each entry to the provided event bus', () => {
        for (const entry of entries) {
            expect(entry.EventBusName).toEqual(process.env.EVENT_BUS_ARN);
        }
    });

    test('sends each entry with the correct event source', () => {
        for (const entry of entries) {
            expect(entry.Source).toEqual('crawl.aws.buzzword');
        }
    });

    test('sends each entry with the new crawl event detail type', () => {
        for (const entry of entries) {
            expect(entry.DetailType).toEqual(
                'New URL Crawled via Crawl Service'
            );
        }
    });

    test(
        'sends all crawled pathnames and associated base URL in entry detail',
        () => {
            const parsedDetails = entries.map(
                entry => JSON.parse(entry.Detail)
            );

            for (const item of items) {
                expect(parsedDetails).toContainEqual(item);
            }
        }
    );
});
