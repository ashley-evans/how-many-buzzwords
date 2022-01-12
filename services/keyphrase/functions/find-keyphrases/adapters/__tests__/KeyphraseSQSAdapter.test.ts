import {
    SQSBatchItemFailure,
    SQSBatchResponse,
    SQSEvent,
    SQSRecord
} from "aws-lambda";
import { mock } from "jest-mock-extended";

import KeyphrasesPort from "../../ports/KeyphrasePort";
import KeyphraseSQSAdapter from "../KeyphraseSQSAdapter";
import { EventFields } from "../../enums";

const mockKeyphrasesPort = mock<KeyphrasesPort>();

const VALID_URL = new URL('http://www.example.com/');
const VALID_CHILD_URL = new URL('http://www.example.com/example');

const adapter = new KeyphraseSQSAdapter(mockKeyphrasesPort);

function createEvent(...records: SQSRecord[]): SQSEvent {
    return {
        Records: records
    };
}

function createRecord(
    baseURL?: string,
    pathname?: string,
    messageID?: string
): SQSRecord {
    const record = mock<SQSRecord>();

    if (baseURL || pathname) {
        record.body = createEventBody(baseURL, pathname);
    }

    if (messageID) {
        record.messageId = messageID;
    }

    return record;
}

function createEventBody(baseURL?: string, pathname?: string): string {
    return JSON.stringify({
        [EventFields.BaseURL]: baseURL,
        [EventFields.Pathname]: pathname
    });
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe.each([
    [
        'empty body',
        createEvent(
            createRecord()
        )
    ],
    [
        'missing base url',
        createEvent(
            createRecord(
                undefined, 
                VALID_URL.pathname
            )
        )
    ],
    [
        'invalid base url',
        createEvent(
            createRecord(
                `test ${VALID_URL.hostname}`,
                VALID_URL.pathname
            )
        )
    ],
    [
        'invalid base url (protocol provided)',
        createEvent(
            createRecord(
                VALID_URL.origin,
                VALID_URL.pathname
            )
        )
    ],
    [
        'missing pathname',
        createEvent(
            createRecord(
                VALID_URL.hostname
            )
        )
    ],
    [
        'invalid pathname',
        createEvent(
            createRecord(
                VALID_URL.hostname,
                'no backslash'
            )
        )
    ]
])('handles invalid event body with %s', (text: string, event: SQSEvent) => {
    let response: SQSBatchResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        response = await adapter.findKeyphrases(event);
    });

    test('does not call keyphrases port', async () => {
        expect(mockKeyphrasesPort.findKeyphrases).toHaveBeenCalledTimes(0);
    });

    test('returns no failures', async () => {
        expect(response).toBeDefined();
        expect(response.batchItemFailures).toHaveLength(0);
    });
});

describe.each([
    [
        'a single valid record',
        [
            VALID_URL
        ]
    ],
    [
        'multiple valid records',
        [
            VALID_URL,
            VALID_CHILD_URL
        ]
    ]
])('handles %s', (text: string, urls: URL[]) => {
    let response: SQSBatchResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        const records = urls.map(
            url => createRecord(
                url.hostname,
                url.pathname
            )
        );
        const event = createEvent(...records);
        mockKeyphrasesPort.findKeyphrases.mockResolvedValue(true);

        response = await adapter.findKeyphrases(event);
    });

    test('calls keyphrase finder with url from records', () => {
        expect(mockKeyphrasesPort.findKeyphrases).toHaveBeenCalledTimes(
            urls.length
        );

        for (const url of urls) {
            expect(mockKeyphrasesPort.findKeyphrases).toHaveBeenCalledWith(
                url
            );
        }
    });

    test('returns no failures if crawl succeeds', () => {
        expect(response).toBeDefined();
        expect(response.batchItemFailures).toHaveLength(0);
    });
});

describe('error handling', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('throws error if keyphrase finder throws an error', async () => {
        const expectedError = new Error('test error');
        mockKeyphrasesPort.findKeyphrases.mockRejectedValue(expectedError);

        const event = createEvent(
            createRecord(
                VALID_URL.hostname,
                VALID_URL.pathname
            )
        );

        expect.assertions(1);
        await expect(adapter.findKeyphrases(event)).rejects.toEqual(
            expectedError
        );
    });

    test.each([
        [
            'a single record',
            [
                createRecord(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    'first'
                ),
            ]
        ],
        [
            'multiple records',
            [
                createRecord(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    'first'
                ),
                createRecord(
                    VALID_CHILD_URL.hostname,
                    VALID_CHILD_URL.pathname,
                    'second'
                ),
            ]
        ]
    ])(
        'returns failed messages if keyphase finder fails for %s',
        async (text: string, records: SQSRecord[]) => {
            const event = createEvent(...records);
            mockKeyphrasesPort.findKeyphrases.mockResolvedValue(false);
    
            const response = await adapter.findKeyphrases(event);

            expect(response).toBeDefined();
            expect(response.batchItemFailures).toHaveLength(records.length);
    
            for (const record of records) {
                expect(response.batchItemFailures)
                    .toContainEqual<SQSBatchItemFailure>({ 
                        itemIdentifier: record.messageId 
                    });
            }
        }
    );
});
