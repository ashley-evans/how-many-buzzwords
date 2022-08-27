import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
    SiteKeyphraseOccurrences,
} from "buzzword-aws-keyphrase-repository-library";
import { mock } from "jest-mock-extended";

import {
    OccurrenceItem,
    TotalOccurrencesPort,
} from "../../ports/TotalOccurrencesPort";
import TotalOccurrencesStreamAdapter from "../TotalOccurrencesStreamAdapter";

const VALID_URL = new URL("https://www.example.com/");

const mockPort = mock<TotalOccurrencesPort>();

const adapter = new TotalOccurrencesStreamAdapter(mockPort);

function createExpectedOccurrenceItem(
    current: SiteKeyphraseOccurrences
): OccurrenceItem {
    return {
        current,
    };
}

function createOccurrence(
    url: URL,
    keyphrase: string,
    occurrences: number
): SiteKeyphraseOccurrences {
    return {
        baseURL: url.hostname,
        pathname: url.pathname,
        keyphrase,
        occurrences,
    };
}

function createSortKey(pathname: string, keyphrase: string): string {
    return `${pathname}#${keyphrase}`;
}

function createEvent(records?: DynamoDBRecord[]) {
    const event = mock<DynamoDBStreamEvent>();
    if (records) {
        event.Records = records;
    }

    return event;
}

function createRecord(
    eventName?: "INSERT",
    pk?: string,
    sk?: string,
    occurrences?: number | string
): DynamoDBRecord {
    const record: DynamoDBRecord = {
        eventName,
    };

    if (pk || sk || occurrences) {
        record.dynamodb = {
            Keys: {
                ...(pk && {
                    [KeyphraseTableKeyFields.HashKey]: {
                        S: pk,
                    },
                }),
                ...(sk && {
                    [KeyphraseTableKeyFields.RangeKey]: {
                        S: sk,
                    },
                }),
            },
            ...(occurrences && {
                NewImage: {
                    [KeyphraseTableNonKeyFields.Occurrences]: {
                        N: occurrences.toString(),
                    },
                },
            }),
        };
    }

    return record;
}

function createOccurrenceInsertRecord(
    url: URL,
    keyphrase: string,
    occurrences: number
): DynamoDBRecord {
    return createRecord(
        "INSERT",
        url.hostname,
        createSortKey(url.pathname, keyphrase),
        occurrences
    );
}

beforeEach(() => {
    mockPort.updateTotal.mockReset();
});

describe.each([
    ["no records array", createEvent()],
    [
        "a record with no event name",
        createEvent([
            createRecord(undefined, "test", createSortKey("test", "test"), 1),
        ]),
    ],
    [
        "a record with a missing partition key",
        createEvent([
            createRecord("INSERT", undefined, createSortKey("test", "test"), 1),
        ]),
    ],
    [
        "a record with a missing sort key",
        createEvent([createRecord("INSERT", "test", undefined, 1)]),
    ],
    [
        "a record with a invalid sort key (missing hierarchy seperator)",
        createEvent([createRecord("INSERT", "test", "test/test", 1)]),
    ],
    [
        "a record with a missing number of occurrences",
        createEvent([
            createRecord("INSERT", "test", createSortKey("test", "test")),
        ]),
    ],
    [
        "a record with a non-numeric number of occurrences",
        createEvent([
            createRecord(
                "INSERT",
                "test",
                createSortKey("test", "test"),
                "this is not a number"
            ),
        ]),
    ],
])(
    "given an invalid event with %s",
    (message: string, event: DynamoDBStreamEvent) => {
        test("does not call port to update totals", async () => {
            await adapter.handleEvent(event);

            expect(mockPort.updateTotal).not.toHaveBeenCalled();
        });

        test("returns no batch item failures", async () => {
            const actual = await adapter.handleEvent(event);

            expect(actual.batchItemFailures).toHaveLength(0);
        });
    }
);

describe("given a single valid insert occurrence record", () => {
    const expected = createOccurrence(VALID_URL, "test", 15);
    const event = createEvent([
        createOccurrenceInsertRecord(
            VALID_URL,
            expected.keyphrase,
            expected.occurrences
        ),
    ]);

    test("calls domain with validated records", async () => {
        await adapter.handleEvent(event);

        expect(mockPort.updateTotal).toHaveBeenCalledTimes(1);
        expect(mockPort.updateTotal).toHaveBeenCalledWith(
            expect.arrayContaining([createExpectedOccurrenceItem(expected)])
        );
    });

    test("returns no batch item failures", async () => {
        const actual = await adapter.handleEvent(event);

        expect(actual.batchItemFailures).toHaveLength(0);
    });
});
