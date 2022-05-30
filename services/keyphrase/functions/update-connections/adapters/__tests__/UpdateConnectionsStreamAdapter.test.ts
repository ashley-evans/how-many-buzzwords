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

function createBaseURLOccurrence(record: DynamoDBRecord): BaseURLOccurrences {
    const newImage = record.dynamodb?.NewImage;
    const keys = record.dynamodb?.Keys;
    if (keys && newImage) {
        const baseURL = keys[KeyphraseTableKeyFields.HashKey].S;
        const splitSK = keys[KeyphraseTableKeyFields.RangeKey].S?.split("#");
        const occurrences = newImage[KeyphraseTableNonKeyFields.Occurrences].N;

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
            NewImage: {
                ...(occurrences && {
                    [KeyphraseTableNonKeyFields.Occurrences]: {
                        N: occurrences.toString(),
                    },
                }),
            },
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
        "a record with missing number of occurrences",
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
        "a record with a non-numeric number of occurrences",
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
                createBaseURLOccurrence(record)
            );

            expect(mockPort.updateExistingConnections).toHaveBeenCalledTimes(
                event.Records.length
            );
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
