import { mock } from "jest-mock-extended";
import {
    DynamoDBStreamEvent,
    DynamoDBRecord,
    SQSBatchResponse,
} from "aws-lambda";
import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "buzzword-aws-keyphrase-repository-library";

import UpdateConnectionsStreamAdapter from "../UpdateConnectionsStreamAdapter";
import {
    BaseURLOccurrences,
    UpdateConnectionsPort,
} from "../../ports/UpdateConnectionsPort";

const mockPort = mock<UpdateConnectionsPort>();

const adapter = new UpdateConnectionsStreamAdapter(mockPort);

const SEQUENCE_NUMBER = "test_sequence_number";
const BASE_URL = new URL("https://www.example.com/test");
const KEYPHRASE = "test_keyphrase";
const OCCURRENCES = 15;
const OTHER_SEQUENCE_NUMBER = "other_sequence_number";
const OTHER_BASE_URL = new URL("https://www.anotherexample.com/wibble");
const OTHER_KEYPHRASE = "other_test_keyphrase";
const OTHER_OCCURRENCES = 23;

function createExpectedBaseURLOccurrence(
    record: DynamoDBRecord
): BaseURLOccurrences {
    const newImage = record.dynamodb?.NewImage;
    const keys = record.dynamodb?.Keys;
    if (keys) {
        const baseURL = keys[KeyphraseTableKeyFields.HashKey].S;
        const splitSK = keys[KeyphraseTableKeyFields.RangeKey].S?.split("#");
        let occurrences: string | undefined;
        if (record.eventName == "REMOVE") {
            occurrences = "0";
        } else if (
            newImage &&
            newImage[KeyphraseTableNonKeyFields.Occurrences]
        ) {
            occurrences = newImage[KeyphraseTableNonKeyFields.Occurrences].N;
        }

        if (baseURL && splitSK && occurrences) {
            return {
                baseURL,
                pathname: splitSK[0],
                keyphrase: splitSK[1],
                occurrences: parseInt(occurrences),
            };
        }
    }

    throw new Error(`Invalid record provided: ${JSON.stringify(record)}.`);
}

function createRecord(
    eventName?: "INSERT" | "MODIFY" | "REMOVE",
    sequenceNumber?: string,
    baseURL?: string,
    sk?: string,
    occurrences?: string | number
): DynamoDBRecord {
    const record: DynamoDBRecord = {
        eventName,
    };

    if (sequenceNumber || baseURL || sk || occurrences) {
        record.dynamodb = {
            Keys: {
                ...(baseURL && {
                    [KeyphraseTableKeyFields.HashKey]: {
                        S: baseURL,
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
            SequenceNumber: sequenceNumber,
        };
    }

    return record;
}

function createEvent(records?: DynamoDBRecord[]) {
    const event = mock<DynamoDBStreamEvent>();
    if (records) {
        event.Records = records;
    }

    return event;
}

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

describe.each([
    ["missing records", createEvent()],
    [
        "a record with a missing sequence number",
        createEvent([
            createRecord(
                "INSERT",
                undefined,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                OCCURRENCES
            ),
        ]),
    ],
    [
        "a record with a missing base URL",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                undefined,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                OCCURRENCES
            ),
        ]),
    ],
    [
        "a record with a missing SK",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                undefined,
                OCCURRENCES
            ),
        ]),
    ],
    [
        "a record with an invalid SK (Missing hierarchy seperator)",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                "an invalid SK",
                OCCURRENCES
            ),
        ]),
    ],
    [
        "an insert record with missing number of occurrences",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                undefined
            ),
        ]),
    ],
    [
        "an insert record with a non-numeric number of occurrences",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                "not a number"
            ),
        ]),
    ],
    [
        "a modify record with missing number of occurrences",
        createEvent([
            createRecord(
                "MODIFY",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                undefined
            ),
        ]),
    ],
    [
        "a modify record with a non-numeric number of occurrences",
        createEvent([
            createRecord(
                "MODIFY",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                "not a number"
            ),
        ]),
    ],
    [
        "multiple records with invalid properties",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                "not a number"
            ),
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                undefined,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                OCCURRENCES
            ),
        ]),
    ],
])(
    "given an invalid event with %s",
    (message: string, event: DynamoDBStreamEvent) => {
        let response: SQSBatchResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            response = await adapter.handleEvent(event);
        });

        test("does not call the port with any new keyphrase states", () => {
            expect(mockPort.updateExistingConnections).not.toHaveBeenCalled();
        });

        test("returns no item failures", () => {
            expect(response).toBeDefined();
            expect(response.batchItemFailures).toHaveLength(0);
        });
    }
);

describe("given an event with both valid and invalid new update connection records", () => {
    const validRecords = [
        createRecord(
            "INSERT",
            SEQUENCE_NUMBER,
            BASE_URL.hostname,
            `${BASE_URL.pathname}#${KEYPHRASE}`,
            OCCURRENCES
        ),
    ];
    const invalidRecords = [
        createRecord(
            "INSERT",
            SEQUENCE_NUMBER,
            BASE_URL.hostname,
            `${BASE_URL.pathname}#${KEYPHRASE}`,
            undefined
        ),
    ];
    const event = createEvent([...invalidRecords, ...validRecords]);

    let response: SQSBatchResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        response = await adapter.handleEvent(event);
    });

    test("calls port to update connections with each valid new keyphrase occurrence details", () => {
        const expectedUpdates = validRecords.map((record) =>
            createExpectedBaseURLOccurrence(record)
        );

        expect(mockPort.updateExistingConnections).toHaveBeenCalledTimes(
            validRecords.length
        );
        expect(mockPort.updateExistingConnections).toHaveBeenCalledWith(
            expect.arrayContaining(expectedUpdates)
        );
    });

    test("returns no item failures", () => {
        expect(response).toBeDefined();
        expect(response.batchItemFailures).toHaveLength(0);
    });
});

describe.each([
    [
        "with a single insert record",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                OCCURRENCES
            ),
        ]),
    ],
    [
        "with multiple insert records",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                OCCURRENCES
            ),
            createRecord(
                "INSERT",
                OTHER_SEQUENCE_NUMBER,
                OTHER_BASE_URL.hostname,
                `${OTHER_BASE_URL.pathname}#${OTHER_KEYPHRASE}`,
                OTHER_OCCURRENCES
            ),
        ]),
    ],
    [
        "with a single modify record",
        createEvent([
            createRecord(
                "MODIFY",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                OCCURRENCES
            ),
        ]),
    ],
    [
        "with multiple modify records",
        createEvent([
            createRecord(
                "MODIFY",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`,
                OCCURRENCES
            ),
            createRecord(
                "MODIFY",
                OTHER_SEQUENCE_NUMBER,
                OTHER_BASE_URL.hostname,
                `${OTHER_BASE_URL.pathname}#${OTHER_KEYPHRASE}`,
                OTHER_OCCURRENCES
            ),
        ]),
    ],
    [
        "with a single remove record",
        createEvent([
            createRecord(
                "REMOVE",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`
            ),
        ]),
    ],
    [
        "with multiple remove records",
        createEvent([
            createRecord(
                "REMOVE",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`
            ),
            createRecord(
                "REMOVE",
                OTHER_SEQUENCE_NUMBER,
                OTHER_BASE_URL.hostname,
                `${OTHER_BASE_URL.pathname}#${OTHER_KEYPHRASE}`
            ),
        ]),
    ],
])(
    "given a valid event with %s",
    (message: string, event: DynamoDBStreamEvent) => {
        let response: SQSBatchResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            response = await adapter.handleEvent(event);
        });

        test("calls port to update connections with each new keyphrase occurrence details", () => {
            const expectedUpdates = event.Records.map((record) =>
                createExpectedBaseURLOccurrence(record)
            );

            expect(mockPort.updateExistingConnections).toHaveBeenCalledTimes(1);
            expect(mockPort.updateExistingConnections).toHaveBeenCalledWith(
                expect.arrayContaining(expectedUpdates)
            );
        });

        test("returns no item failures", () => {
            expect(response).toBeDefined();
            expect(response.batchItemFailures).toHaveLength(0);
        });
    }
);

test.each([
    [
        "sequence numbers for records if all updates fail to send",
        [
            createRecord(
                "REMOVE",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`
            ),
            createRecord(
                "REMOVE",
                OTHER_SEQUENCE_NUMBER,
                OTHER_BASE_URL.hostname,
                `${OTHER_BASE_URL.pathname}#${OTHER_KEYPHRASE}`
            ),
        ],
        [],
    ],
    [
        "relevant sequence numbers when some records failed to send",
        [
            createRecord(
                "REMOVE",
                SEQUENCE_NUMBER,
                BASE_URL.hostname,
                `${BASE_URL.pathname}#${KEYPHRASE}`
            ),
        ],
        [
            createRecord(
                "REMOVE",
                OTHER_SEQUENCE_NUMBER,
                OTHER_BASE_URL.hostname,
                `${OTHER_BASE_URL.pathname}#${OTHER_KEYPHRASE}`
            ),
        ],
    ],
])(
    "returns all %s",
    async (
        message: string,
        expectedFailureRecords: DynamoDBRecord[],
        expectedSuccessRecords: DynamoDBRecord[]
    ) => {
        jest.resetAllMocks();
        const failedUpdates = expectedFailureRecords.map((record) =>
            createExpectedBaseURLOccurrence(record)
        );
        mockPort.updateExistingConnections.mockResolvedValue(failedUpdates);
        const event = createEvent([
            ...expectedFailureRecords,
            ...expectedSuccessRecords,
        ]);

        const result = await adapter.handleEvent(event);

        expect(result.batchItemFailures).toHaveLength(
            expectedFailureRecords.length
        );
        for (const expectedFailureRecord of expectedFailureRecords) {
            expect(result.batchItemFailures).toContainEqual({
                itemIdentifier: expectedFailureRecord.dynamodb?.SequenceNumber,
            });
        }
    }
);
