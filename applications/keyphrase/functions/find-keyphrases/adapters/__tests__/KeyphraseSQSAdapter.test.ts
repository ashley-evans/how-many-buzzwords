import { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { mock } from "jest-mock-extended";

import KeyphrasesPort from "../../ports/KeyphrasePort";
import KeyphraseSQSAdapter from "../KeyphraseSQSAdapter";
import { URLsTableKeyFields } from "../../enums";

const mockKeyphrasesPort = mock<KeyphrasesPort>();

const VALID_URL = new URL('http://www.example.com/');

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
        [URLsTableKeyFields.HashKey]: baseURL,
        [URLsTableKeyFields.SortKey]: pathname
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
