import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import { EventClient } from "buzzword-crawl-event-client-library";
import { URLsTableKeyFields } from "buzzword-crawl-urls-repository-library";
import { mock } from "jest-mock-extended";
import PublishURLsStreamAdapter from "../PublishURLsStreamAdapter";

const VALID_URL = new URL("https://www.example.com/test");
const VALID_SEQUENCE_NUMBER = "1";

const mockEventClient = mock<EventClient>();

const adapter = new PublishURLsStreamAdapter(mockEventClient);

function createEvent(records?: DynamoDBRecord[]) {
    const event = mock<DynamoDBStreamEvent>();
    if (records) {
        event.Records = records;
    }

    return event;
}

function createRecord(
    pk?: string,
    sk?: string,
    sequenceNumber?: string
): DynamoDBRecord {
    const record = mock<DynamoDBRecord>();
    if (pk || sk || sequenceNumber) {
        record.dynamodb = {
            NewImage: {
                ...(pk && {
                    [URLsTableKeyFields.HashKey]: {
                        S: pk,
                    },
                }),
                ...(sk && {
                    [URLsTableKeyFields.SortKey]: {
                        S: sk,
                    },
                }),
            },
            SequenceNumber: sequenceNumber,
        };
    }

    return record;
}

function createNewURLRecord(url: URL, sequenceNumber: string): DynamoDBRecord {
    return createRecord(url.hostname, url.pathname, sequenceNumber);
}

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

beforeEach(() => {
    mockEventClient.publishURL.mockReset();
});

describe.each([
    ["no records array", createEvent()],
    [
        "a record with a missing partition key",
        createEvent([
            createRecord(undefined, VALID_URL.pathname, VALID_SEQUENCE_NUMBER),
        ]),
    ],
    [
        "a record with an invalid partition key (spaces)",
        createEvent([
            createRecord(
                "i am invalid",
                VALID_URL.pathname,
                VALID_SEQUENCE_NUMBER
            ),
        ]),
    ],
    [
        "a record with an invalid partition key (numeric)",
        createEvent([
            createRecord("1", VALID_URL.pathname, VALID_SEQUENCE_NUMBER),
        ]),
    ],
    [
        "a record with a missing sort key",
        createEvent([
            createRecord(VALID_URL.hostname, undefined, VALID_SEQUENCE_NUMBER),
        ]),
    ],
    [
        "a record with a invalid sort key (missing leading forward slash)",
        createEvent([
            createRecord(VALID_URL.hostname, "test", VALID_SEQUENCE_NUMBER),
        ]),
    ],
    [
        "a record with a missing DynamoDB sequence number",
        createEvent([createRecord(VALID_URL.hostname, VALID_URL.pathname)]),
    ],
    [
        "multiple records with invalid properties",
        createEvent([
            createRecord(VALID_URL.hostname, undefined, VALID_SEQUENCE_NUMBER),
            createRecord(VALID_URL.hostname, "test", VALID_SEQUENCE_NUMBER),
        ]),
    ],
])(
    "given an invalid event with %s",
    (message: string, event: DynamoDBStreamEvent) => {
        test("does not call event client to publish any URLs", async () => {
            await adapter.handleEvent(event);

            expect(mockEventClient.publishURL).not.toHaveBeenCalled();
        });

        test("returns no batch item failures", async () => {
            const actual = await adapter.handleEvent(event);

            expect(actual.batchItemFailures).toHaveLength(0);
        });
    }
);

describe.each([
    ["a single", [VALID_URL]],
    ["multiple", [VALID_URL, new URL("https://www.test.com/wibble")]],
])("given %s new URL stream record", (message: string, urls: URL[]) => {
    const records = urls.map((url) => createNewURLRecord(url, "test"));
    const event = createEvent(records);

    test("calls event client to publish each new URL provided", async () => {
        await adapter.handleEvent(event);

        expect(mockEventClient.publishURL).toHaveBeenCalledTimes(1);
        expect(mockEventClient.publishURL).toHaveBeenCalledWith(urls);
    });

    test("returns no batch item failures if update to totals succeeds", async () => {
        const actual = await adapter.handleEvent(event);

        expect(actual.batchItemFailures).toHaveLength(0);
    });
});
