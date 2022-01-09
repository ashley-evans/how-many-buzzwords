const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { mockClient } = require('aws-sdk-client-mock');

const {
    URLsTableKeyFields,
    CrawlTopicMessageAttributes,
    CrawlEventTypes
} = require('buzzword-aws-crawl-common');

const mockSNSClient = mockClient(SNSClient);

const EXPECTED_BASE_URL = 'www.test.com';
const EXPECTED_PATHNAME = '/test';

process.env.TARGET_SNS_ARN = 'test:arn';

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

const createExpectedMessage = (baseUrl, pathname) => {
    return {
        Message: JSON.stringify({
            [URLsTableKeyFields.HashKey]: baseUrl,
            [URLsTableKeyFields.SortKey]: pathname
        }),
        MessageAttributes: {
            [CrawlTopicMessageAttributes.EventType]: {
                DataType: "String",
                StringValue: CrawlEventTypes.NewURLCrawled
            }
        },
        TargetArn: process.env.TARGET_SNS_ARN
    };
};

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

beforeEach(() => {
    mockSNSClient.reset();
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

test.each([
    [
        'a single record',
        createEvent(createRecord(EXPECTED_BASE_URL, '/')),
        [
            createExpectedMessage(EXPECTED_BASE_URL, '/')
        ]
    ],
    [
        'multiple records',
        createEvent(
            createRecord(EXPECTED_BASE_URL, '/'),
            createRecord(EXPECTED_BASE_URL, EXPECTED_PATHNAME)
        ),
        [
            createExpectedMessage(EXPECTED_BASE_URL, '/'),
            createExpectedMessage(EXPECTED_BASE_URL, EXPECTED_PATHNAME)
        ]
    ]
])('publishes to SNS topic given %s',
    async (message, event, expectedMessages) => {
        mockSNSClient.on(PublishCommand).resolves();

        await handler(event);
        const snsArguments = mockSNSClient.calls().map(call => call.args);

        expect(snsArguments).toHaveLength(expectedMessages.length);
        for (let i = 0; i < snsArguments.length; i++) {
            expect(snsArguments[i]).toHaveLength(1);
        }

        const snsArgumentInputs = snsArguments.map(args => args[0].input);
        for (let i = 0; i < snsArguments.length; i++) {
            expect(snsArgumentInputs).toContainEqual(expectedMessages[i]);
        }
    }
);
