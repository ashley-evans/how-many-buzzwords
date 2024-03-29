import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import {
    KeyphraseTableConstants,
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
    SiteKeyphraseOccurrences,
} from "buzzword-keyphrase-keyphrase-repository-library";
import { mock } from "jest-mock-extended";

import {
    OccurrenceItem,
    OccurrenceTotalImage,
    TotalItem,
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
    occurrences: number,
    aggregated: boolean
): SiteKeyphraseOccurrences {
    return {
        baseURL: url.hostname,
        pathname: url.pathname,
        keyphrase,
        occurrences,
        aggregated,
    };
}

function createExpectedTotalItem(
    current: OccurrenceTotalImage,
    previous?: OccurrenceTotalImage
): TotalItem {
    return {
        current,
        previous,
    };
}

function createTotalOccurrence(
    keyphrase: string,
    occurrences: number,
    url?: URL
): OccurrenceTotalImage {
    return {
        baseURL: url?.hostname,
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
    sequenceNumber?: string,
    pk?: string,
    sk?: string,
    newOccurrences?: number | string,
    oldOccurrences?: number | string,
    newAggregated?: boolean,
    oldAggregated?: boolean
): DynamoDBRecord {
    const record: DynamoDBRecord = {
        eventName,
    };

    if (
        pk ||
        sk ||
        newOccurrences ||
        oldOccurrences ||
        newAggregated ||
        oldAggregated ||
        sequenceNumber
    ) {
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
            SequenceNumber: sequenceNumber,
            ...((newOccurrences || newAggregated != undefined) && {
                NewImage: {
                    ...(newOccurrences && {
                        [KeyphraseTableNonKeyFields.Occurrences]: {
                            N: newOccurrences.toString(),
                        },
                    }),
                    ...(newAggregated != undefined && {
                        [KeyphraseTableNonKeyFields.Aggregated]: {
                            BOOL: newAggregated,
                        },
                    }),
                },
            }),
            ...((oldOccurrences || oldAggregated != undefined) && {
                OldImage: {
                    ...(oldOccurrences && {
                        [KeyphraseTableNonKeyFields.Occurrences]: {
                            N: oldOccurrences.toString(),
                        },
                    }),
                    ...(oldAggregated != undefined && {
                        [KeyphraseTableNonKeyFields.Aggregated]: {
                            BOOL: oldAggregated,
                        },
                    }),
                },
            }),
        };
    }

    return record;
}

function createOccurrenceInsertRecord(
    url: URL,
    keyphrase: string,
    occurrences: number,
    sequenceNumber: string
): DynamoDBRecord {
    return createRecord(
        "INSERT",
        sequenceNumber,
        url.hostname,
        createSortKey(url.pathname, keyphrase),
        occurrences,
        undefined,
        false
    );
}

function createOccurrenceModifyRecord(
    url: URL,
    keyphrase: string,
    newOccurrences: number,
    oldOccurrences: number,
    sequenceNumber: string,
    newAggregated?: boolean,
    oldAggregated?: boolean
): DynamoDBRecord {
    return createRecord(
        "MODIFY",
        sequenceNumber,
        url.hostname,
        createSortKey(url.pathname, keyphrase),
        newOccurrences,
        oldOccurrences,
        newAggregated,
        oldAggregated
    );
}

function createTotalInsertRecord(
    keyphrase: string,
    occurrences: number,
    sequenceNumber: string,
    url?: URL
) {
    if (url) {
        return createRecord(
            "INSERT",
            sequenceNumber,
            url.hostname,
            createSortKey(KeyphraseTableConstants.TotalKey, keyphrase),
            occurrences
        );
    }

    return createRecord(
        "INSERT",
        sequenceNumber,
        KeyphraseTableConstants.TotalKey,
        keyphrase,
        occurrences
    );
}

function createTotalModifyRecord(
    keyphrase: string,
    newOccurrences: number,
    sequenceNumber: string,
    oldOccurences?: number,
    url?: URL
) {
    if (url) {
        return createRecord(
            "MODIFY",
            sequenceNumber,
            url.hostname,
            createSortKey(KeyphraseTableConstants.TotalKey, keyphrase),
            newOccurrences,
            oldOccurences
        );
    }

    return createRecord(
        "MODIFY",
        sequenceNumber,
        KeyphraseTableConstants.TotalKey,
        keyphrase,
        newOccurrences,
        oldOccurences
    );
}

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
    mockPort.updateTotal.mockReset();
    mockPort.updateTotal.mockResolvedValue([]);
});

describe.each([
    ["no records array", createEvent()],
    [
        "a record with no event name",
        createEvent([
            createRecord(
                undefined,
                "sequence_number",
                "test",
                createSortKey("test", "test"),
                1
            ),
        ]),
    ],
    [
        "a record with no sequence number",
        createEvent([
            createRecord(
                "INSERT",
                undefined,
                "test",
                createSortKey("test", "test"),
                1
            ),
        ]),
    ],
    [
        "a record with a missing partition key",
        createEvent([
            createRecord(
                "INSERT",
                "sequence_number",
                undefined,
                createSortKey("test", "test"),
                1
            ),
        ]),
    ],
    [
        "a record with a missing sort key",
        createEvent([
            createRecord("INSERT", "sequence_number", "test", undefined, 1),
        ]),
    ],
    [
        "a record with a invalid sort key (missing hierarchy seperator)",
        createEvent([
            createRecord("INSERT", "sequence_number", "test", "test/test", 1),
        ]),
    ],
    [
        "a record with a missing number of new occurrences",
        createEvent([
            createRecord(
                "INSERT",
                "sequence_number",
                "test",
                createSortKey("test", "test")
            ),
        ]),
    ],
    [
        "a record with a non-numeric number of new occurrences",
        createEvent([
            createRecord(
                "INSERT",
                "sequence_number",
                "test",
                createSortKey("test", "test"),
                "this is not a number"
            ),
        ]),
    ],
    [
        "a modify record with a missing number of old occurrences",
        createEvent([
            createRecord(
                "MODIFY",
                "sequence_number",
                "test",
                createSortKey("test", "test"),
                1
            ),
        ]),
    ],
    [
        "a modify record with a non-numeric number of old occurrences",
        createEvent([
            createRecord(
                "MODIFY",
                "sequence_number",
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
            createRecord(
                "INSERT",
                "sequence_number",
                undefined,
                createSortKey("test", "test"),
                1
            ),
            createRecord(
                "INSERT",
                "sequence_number",
                "test",
                createSortKey("test", "test")
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

describe("given an event with both valid and invalid insert occurrence records", () => {
    const expected = createOccurrence(VALID_URL, "test", 15, false);
    const event = createEvent([
        createRecord(
            "INSERT",
            "sequence_number",
            "test",
            createSortKey("test", "test")
        ),
        createOccurrenceInsertRecord(
            VALID_URL,
            expected.keyphrase,
            expected.occurrences,
            "sequence_number"
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
        const actual = await adapter.handleEvent(event);

        expect(actual.batchItemFailures).toHaveLength(0);
    });
});

describe.each([
    ["a single", [createOccurrence(VALID_URL, "test", 15, false)]],
    [
        "multiple",
        [
            createOccurrence(VALID_URL, "test", 15, false),
            createOccurrence(VALID_URL, "dyson", 16, false),
        ],
    ],
])(
    "given %s valid insert occurrence record",
    (message: string, occurrences: SiteKeyphraseOccurrences[]) => {
        const records = occurrences.map((current) =>
            createOccurrenceInsertRecord(
                VALID_URL,
                current.keyphrase,
                current.occurrences,
                "sequence_number"
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
            const actual = await adapter.handleEvent(event);

            expect(actual.batchItemFailures).toHaveLength(0);
        });
    }
);

describe("given a valid modify occurrence record", () => {
    const expectedKeyphrase = "test";
    const oldOccurences = createOccurrence(
        VALID_URL,
        expectedKeyphrase,
        1,
        false
    );
    const newOccurrences = createOccurrence(
        VALID_URL,
        expectedKeyphrase,
        5,
        false
    );
    const record = createOccurrenceModifyRecord(
        VALID_URL,
        expectedKeyphrase,
        newOccurrences.occurrences,
        oldOccurences.occurrences,
        "sequence_number",
        newOccurrences.aggregated,
        oldOccurences.aggregated
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
        const actual = await adapter.handleEvent(event);

        expect(actual.batchItemFailures).toHaveLength(0);
    });
});

describe.each([
    ["global", undefined],
    ["site", VALID_URL],
])("given a valid insert %s total record", (message: string, site?: URL) => {
    const total = createTotalOccurrence("test", 15, site);
    const event = createEvent([
        createTotalInsertRecord(
            total.keyphrase,
            total.occurrences,
            "sequence_number",
            site
        ),
    ]);

    test("calls domain with provided total record", async () => {
        const expected = createExpectedTotalItem(total);

        await adapter.handleEvent(event);

        expect(mockPort.updateTotal).toHaveBeenCalledTimes(1);
        expect(mockPort.updateTotal).toHaveBeenCalledWith(
            expect.arrayContaining([expected])
        );
    });

    test("returns no batch item failures if update to totals succeeds", async () => {
        const actual = await adapter.handleEvent(event);

        expect(actual.batchItemFailures).toHaveLength(0);
    });
});

describe.each([
    ["global", undefined],
    ["site", VALID_URL],
])("given a valid modify %s total record", (message: string, site?: URL) => {
    const expectedKeyphrase = "test";
    const oldOccurences = createTotalOccurrence(expectedKeyphrase, 15, site);
    const newOccurrences = createTotalOccurrence(expectedKeyphrase, 17, site);
    const record = createTotalModifyRecord(
        expectedKeyphrase,
        newOccurrences.occurrences,
        "sequence_number",
        oldOccurences.occurrences,
        site
    );
    const event = createEvent([record]);

    test("calls domain with both new and old state of occurrence record", async () => {
        const expected = createExpectedTotalItem(newOccurrences, oldOccurences);

        await adapter.handleEvent(event);

        expect(mockPort.updateTotal).toHaveBeenCalledTimes(1);
        expect(mockPort.updateTotal).toHaveBeenCalledWith(
            expect.arrayContaining([expected])
        );
    });

    test("returns no batch item failures if update to totals succeeds", async () => {
        const actual = await adapter.handleEvent(event);

        expect(actual.batchItemFailures).toHaveLength(0);
    });
});

test("returns all sequence numbers as batch failures if totals returns all failed", async () => {
    const occurrences = [
        createOccurrence(VALID_URL, "test", 15, false),
        createOccurrence(VALID_URL, "wibble", 12, false),
    ];
    mockPort.updateTotal.mockResolvedValue(occurrences);
    const expectedSequenceNumbers = ["sequence_number_1", "sequence_number_2"];
    const event = createEvent([
        createOccurrenceInsertRecord(
            VALID_URL,
            occurrences[0].keyphrase,
            occurrences[0].occurrences,
            expectedSequenceNumbers[0]
        ),
        createOccurrenceInsertRecord(
            VALID_URL,
            occurrences[1].keyphrase,
            occurrences[1].occurrences,
            expectedSequenceNumbers[1]
        ),
    ]);

    const actual = await adapter.handleEvent(event);

    expect(actual.batchItemFailures).toHaveLength(2);
    expect(actual.batchItemFailures).toEqual(
        expect.arrayContaining(
            expectedSequenceNumbers.map((sequenceNumber) => ({
                itemIdentifier: sequenceNumber,
            }))
        )
    );
});

test("returns only related sequence numbers as batch failures if totals returns partial failures", async () => {
    const occurrences = [
        createOccurrence(VALID_URL, "test", 15, false),
        createOccurrence(VALID_URL, "wibble", 12, false),
    ];
    mockPort.updateTotal.mockResolvedValue([occurrences[1]]);
    const sequenceNumbers = ["sequence_number_1", "sequence_number_2"];
    const event = createEvent([
        createOccurrenceInsertRecord(
            VALID_URL,
            occurrences[0].keyphrase,
            occurrences[0].occurrences,
            sequenceNumbers[0]
        ),
        createOccurrenceInsertRecord(
            VALID_URL,
            occurrences[1].keyphrase,
            occurrences[1].occurrences,
            sequenceNumbers[1]
        ),
    ]);

    const actual = await adapter.handleEvent(event);

    expect(actual.batchItemFailures).toHaveLength(1);
    expect(actual.batchItemFailures[0]).toEqual({
        itemIdentifier: sequenceNumbers[1],
    });
});

test("throws an error if an unhandled exception occurs while updating totals", async () => {
    mockPort.updateTotal.mockRejectedValue(new Error());
    const event = createEvent([
        createOccurrenceInsertRecord(VALID_URL, "test", 15, "sequence_number"),
    ]);

    expect.assertions(1);
    await expect(adapter.handleEvent(event)).rejects.toEqual(
        expect.objectContaining({
            message: expect.stringContaining(
                "Failed to update totals for provided records:"
            ),
        })
    );
});
