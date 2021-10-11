const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { mockClient } = require('aws-sdk-client-mock');

const mockSNSClient = mockClient(SNSClient);

const EXPECTED_BASE_URL = 'http://www.test.com/';
const EXPECTED_CHILD_URL = 'http://www.test.com/test';

process.env.targetSNSArn = 'test:arn';

const { handler } = require('../publish-urls');

const createRecord = (baseUrl, childUrl) => {
    return {
        dynamodb: {
            NewImage: {
                ChildUrl: {
                    S: childUrl
                },
                BaseUrl: {
                    S: baseUrl
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

const createExpectedMessage = (baseUrl, childUrl) => {
    return {
        Message: JSON.stringify({
            baseUrl,
            childUrl
        }),
        TargetArn: process.env.targetSNSArn
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
        ['event with no records', {}],
        ['record with no DynamoDB field', createEvent({})],
        [
            'record with non-object DynamoDB field',
            createEvent({ dynamodb: 'test' })
        ],
        ['record with missing NewImage field', createEvent({ dynamodb: {} })],
        [
            'record with non-object NewImage field',
            createEvent({ dynamodb: { Newimage: 'test' } })
        ],
        [
            'record with missing BaseUrl field',
            createEvent({ dynamodb: { NewImage: { ChildUrl: {} } } })
        ],
        [
            'record with non-object BaseUrl field',
            createEvent(
                { dynamodb: { NewImage: { BaseUrl: 'test', ChildUrl: {} } } }
            )
        ],
        [
            'record with missing ChildUrl field',
            createEvent({ dynamodb: { NewImage: { BaseUrl: {} } } })
        ],
        [
            'record with non-object ChildUrl field',
            createEvent(
                { dynamodb: { NewImage: { BaseUrl: {}, ChildUrl: 'test' } } }
            )
        ],
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
        }
    );
});

test.each([
    [
        'a single record',
        createEvent(createRecord(EXPECTED_BASE_URL, EXPECTED_BASE_URL)),
        [
            createExpectedMessage(EXPECTED_BASE_URL, EXPECTED_BASE_URL)
        ]
    ],
    [
        'multiple records',
        createEvent(
            createRecord(EXPECTED_BASE_URL, EXPECTED_BASE_URL),
            createRecord(EXPECTED_BASE_URL, EXPECTED_CHILD_URL)
        ),
        [
            createExpectedMessage(EXPECTED_BASE_URL, EXPECTED_BASE_URL),
            createExpectedMessage(EXPECTED_BASE_URL, EXPECTED_CHILD_URL)
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
