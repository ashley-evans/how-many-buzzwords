import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import { EventClient } from "buzzword-crawl-event-client-library";
import {
    URLsTableConstants,
    URLsTableKeyFields,
} from "buzzword-crawl-urls-repository-library";
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

function createPartitionKey(hostname: string): string {
    return `${URLsTableConstants.URLPartitionKeyPrefix}#${hostname}`;
}

function createSortKey(pathname: string): string {
    return `${URLsTableConstants.PathSortKeyPrefix}#${pathname}`;
}

function createNewURLRecord(url: URL, sequenceNumber: string): DynamoDBRecord {
    return createRecord(
        createPartitionKey(url.hostname),
        createSortKey(url.pathname),
        sequenceNumber
    );
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
            createRecord(
                undefined,
                createSortKey(VALID_URL.pathname),
                VALID_SEQUENCE_NUMBER
            ),
        ]),
    ],
    [
        "a record with an invalid partition key (missing prefix)",
        createEvent([
            createRecord(
                VALID_URL.hostname,
                createSortKey(VALID_URL.pathname),
                VALID_SEQUENCE_NUMBER
            ),
        ]),
    ],
    [
        "a record with an invalid partition key (spaces)",
        createEvent([
            createRecord(
                createPartitionKey("i am invalid"),
                createSortKey(VALID_URL.pathname),
                VALID_SEQUENCE_NUMBER
            ),
        ]),
    ],
    [
        "a record with an invalid partition key (numeric)",
        createEvent([
            createRecord(
                createPartitionKey("1"),
                createSortKey(VALID_URL.pathname),
                VALID_SEQUENCE_NUMBER
            ),
        ]),
    ],
    [
        "a record with a missing sort key",
        createEvent([
            createRecord(
                createPartitionKey(VALID_URL.hostname),
                undefined,
                VALID_SEQUENCE_NUMBER
            ),
        ]),
    ],
    [
        "a record with an invalid sort key (missing prefix)",
        createEvent([
            createRecord(
                createPartitionKey(VALID_URL.hostname),
                VALID_URL.pathname,
                VALID_SEQUENCE_NUMBER
            ),
        ]),
    ],
    [
        "a record with a invalid sort key (missing leading forward slash)",
        createEvent([
            createRecord(
                createPartitionKey(VALID_URL.hostname),
                createSortKey("test"),
                VALID_SEQUENCE_NUMBER
            ),
        ]),
    ],
    [
        "a record with a missing DynamoDB sequence number",
        createEvent([
            createRecord(
                createPartitionKey(VALID_URL.hostname),
                createSortKey(VALID_URL.pathname)
            ),
        ]),
    ],
    [
        "multiple records with invalid properties",
        createEvent([
            createRecord(
                createPartitionKey(VALID_URL.hostname),
                undefined,
                VALID_SEQUENCE_NUMBER
            ),
            createRecord(
                createPartitionKey(VALID_URL.hostname),
                createSortKey("test"),
                VALID_SEQUENCE_NUMBER
            ),
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

test("returns all provided sequence numbers if an unhandled error is thrown while publishing URLs", async () => {
    mockEventClient.publishURL.mockRejectedValue(new Error());
    const expectedSequenceNumbers = ["1", "2"];
    const event = createEvent([
        createNewURLRecord(VALID_URL, expectedSequenceNumbers[0]),
        createNewURLRecord(
            new URL("https://www.test.com/"),
            expectedSequenceNumbers[1]
        ),
    ]);

    const actual = await adapter.handleEvent(event);

    expect(actual.batchItemFailures).toHaveLength(
        expectedSequenceNumbers.length
    );
    for (const expected of expectedSequenceNumbers) {
        expect(actual.batchItemFailures).toContainEqual({
            itemIdentifier: expected,
        });
    }
});

test("returns sequence numbers related to failed URL given a URL fails to publish", async () => {
    mockEventClient.publishURL.mockResolvedValue([VALID_URL]);
    const expectedSequnceNumber = "1";
    const event = createEvent([
        createNewURLRecord(VALID_URL, expectedSequnceNumber),
        createNewURLRecord(new URL("https://www.test.com/"), "100"),
    ]);

    const actual = await adapter.handleEvent(event);

    expect(actual.batchItemFailures).toHaveLength(1);
    expect(actual.batchItemFailures[0]).toEqual({
        itemIdentifier: expectedSequnceNumber,
    });
});
