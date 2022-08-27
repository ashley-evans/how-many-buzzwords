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
    current: SiteKeyphraseOccurrences,
    previous?: SiteKeyphraseOccurrences
): OccurrenceItem {
    return {
        current,
        previous,
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
    eventName?: "INSERT" | "MODIFY",
    pk?: string,
    sk?: string,
    newOccurrences?: number | string,
    oldOccurrences?: number | string
): DynamoDBRecord {
    const record: DynamoDBRecord = {
        eventName,
    };

    if (pk || sk || newOccurrences || oldOccurrences) {
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
            ...(newOccurrences && {
                NewImage: {
                    [KeyphraseTableNonKeyFields.Occurrences]: {
                        N: newOccurrences.toString(),
                    },
                },
            }),
            ...(oldOccurrences && {
                OldImage: {
                    [KeyphraseTableNonKeyFields.Occurrences]: {
                        N: oldOccurrences.toString(),
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

function createOccurrenceModifyRecord(
    url: URL,
    keyphrase: string,
    newOccurrences: number,
    oldOccurrences: number
): DynamoDBRecord {
    return createRecord(
        "MODIFY",
        url.hostname,
        createSortKey(url.pathname, keyphrase),
        newOccurrences,
        oldOccurrences
    );
}

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

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
        "a record with a missing number of new occurrences",
        createEvent([
            createRecord("INSERT", "test", createSortKey("test", "test")),
        ]),
    ],
    [
        "a record with a non-numeric number of new occurrences",
        createEvent([
            createRecord(
                "INSERT",
                "test",
                createSortKey("test", "test"),
                "this is not a number"
            ),
        ]),
    ],
    [
        "a modify record with a missing number of old occurrences",
        createEvent([
            createRecord("MODIFY", "test", createSortKey("test", "test"), 1),
        ]),
    ],
    [
        "a modify record with a non-numeric number of old occurrences",
        createEvent([
            createRecord(
                "MODIFY",
                "test",
                createSortKey("test", "test"),
                1,
                "this is not a number"
            ),
        ]),
    ],
    [
        "multiple records with invalid properties",
        createEvent([
            createRecord("INSERT", undefined, createSortKey("test", "test"), 1),
            createRecord("INSERT", "test", createSortKey("test", "test")),
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

describe("given an event with both valid and invalid insert occurrence records", () => {
    const expected = createOccurrence(VALID_URL, "test", 15);
    const event = createEvent([
        createRecord("INSERT", "test", createSortKey("test", "test")),
        createOccurrenceInsertRecord(
            VALID_URL,
            expected.keyphrase,
            expected.occurrences
        ),
    ]);

    test("only calls domain with valid records", async () => {
        await adapter.handleEvent(event);

        expect(mockPort.updateTotal).toHaveBeenCalledTimes(1);
        expect(mockPort.updateTotal).toHaveBeenCalledWith([
            createExpectedOccurrenceItem(expected),
        ]);
    });

    test("returns no batch item failures if update to totals succeeds", async () => {
        mockPort.updateTotal.mockResolvedValue(true);

        const actual = await adapter.handleEvent(event);

        expect(actual.batchItemFailures).toHaveLength(0);
    });
});

describe.each([
    ["a single", [createOccurrence(VALID_URL, "test", 15)]],
    [
        "multiple",
        [
            createOccurrence(VALID_URL, "test", 15),
            createOccurrence(VALID_URL, "dyson", 16),
        ],
    ],
])(
    "given %s valid insert occurrence record",
    (message: string, occurrences: SiteKeyphraseOccurrences[]) => {
        const records = occurrences.map((current) =>
            createOccurrenceInsertRecord(
                VALID_URL,
                current.keyphrase,
                current.occurrences
            )
        );
        const event = createEvent(records);

        test("calls domain with validated records", async () => {
            const expected = occurrences.map((current) =>
                createExpectedOccurrenceItem(current)
            );

            await adapter.handleEvent(event);

            expect(mockPort.updateTotal).toHaveBeenCalledTimes(1);
            expect(mockPort.updateTotal).toHaveBeenCalledWith(
                expect.arrayContaining(expected)
            );
        });

        test("returns no batch item failures if update to totals succeeds", async () => {
            mockPort.updateTotal.mockResolvedValue(true);

            const actual = await adapter.handleEvent(event);

            expect(actual.batchItemFailures).toHaveLength(0);
        });
    }
);

describe("given a modify occurrence record", () => {
    const expectedKeyphrase = "test";
    const oldOccurences = createOccurrence(VALID_URL, expectedKeyphrase, 1);
    const newOccurrences = createOccurrence(VALID_URL, expectedKeyphrase, 5);
    const record = createOccurrenceModifyRecord(
        VALID_URL,
        expectedKeyphrase,
        newOccurrences.occurrences,
        oldOccurences.occurrences
    );
    const event = createEvent([record]);

    test("calls domain with both new and old state of occurrence record", async () => {
        const expected = createExpectedOccurrenceItem(
            newOccurrences,
            oldOccurences
        );

        await adapter.handleEvent(event);

        expect(mockPort.updateTotal).toHaveBeenCalledTimes(1);
        expect(mockPort.updateTotal).toHaveBeenCalledWith(
            expect.arrayContaining([expected])
        );
    });

    test("returns no batch item failures if update to totals succeeds", async () => {
        mockPort.updateTotal.mockResolvedValue(true);

        const actual = await adapter.handleEvent(event);

        expect(actual.batchItemFailures).toHaveLength(0);
    });
});
