import { mock } from "jest-mock-extended";
import {
    DynamoDBStreamEvent,
    DynamoDBRecord,
    SQSBatchResponse,
} from "aws-lambda";
import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "buzzword-keyphrase-active-connections-repository-library";

import NewConnectionStreamAdapter from "../NewConnectionStreamAdapter";
import { NewConnectionPort, Connection } from "../../ports/NewConnectionPort";

const mockPort = mock<NewConnectionPort>();

const adapter = new NewConnectionStreamAdapter(mockPort);

const CONNECTION_ID = "test_connection_id";
const SEQUENCE_NUMBER = "test_sequence_number";
const CALLBACK_URL = new URL("https://www.callback.com/");
const BASE_URL = "www.example.com";
const OTHER_CONNECTION_ID = "test_connection_id_2";
const OTHER_SEQUENCE_NUMBER = "test_sequence_number_2";
const OTHER_CALLBACK_URL = new URL("https://www.another-callback.com/");
const OTHER_BASE_URL = "www.otherexample.com";

function createConnection(record: DynamoDBRecord): Connection {
    if (record.dynamodb?.NewImage) {
        const newImage = record.dynamodb.NewImage;
        const connectionID =
            newImage[ActiveConnectionsTableKeyFields.ConnectionIDKey].S;
        const baseURL =
            newImage[ActiveConnectionsTableKeyFields.ListeningURLKey].S;
        const callbackURL =
            newImage[ActiveConnectionsTableNonKeyFields.CallbackURLKey].S;

        if (connectionID && baseURL && callbackURL) {
            return {
                connectionID,
                baseURL,
                callbackURL: new URL(callbackURL),
            };
        }
    }

    throw new Error(`Invalid record provided: ${JSON.stringify(record)}.`);
}

function createRecord(
    eventName?: "INSERT" | "MODIFY" | "REMOVE",
    sequenceNumber?: string,
    connectionID?: string,
    baseURL?: string,
    callbackURL?: URL | string
): DynamoDBRecord {
    const record: DynamoDBRecord = {
        eventName,
    };
    if (connectionID || baseURL || callbackURL) {
        record.dynamodb = {
            NewImage: {
                ...(connectionID && {
                    [ActiveConnectionsTableKeyFields.ConnectionIDKey]: {
                        S: connectionID,
                    },
                }),
                ...(baseURL && {
                    [ActiveConnectionsTableKeyFields.ListeningURLKey]: {
                        S: baseURL,
                    },
                }),
                ...(callbackURL && {
                    [ActiveConnectionsTableNonKeyFields.CallbackURLKey]: {
                        S: callbackURL.toString(),
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

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

describe.each([
    ["missing records", createEvent()],
    [
        "a record with a modify event type",
        createEvent([
            createRecord(
                "MODIFY",
                SEQUENCE_NUMBER,
                CONNECTION_ID,
                BASE_URL,
                CALLBACK_URL
            ),
        ]),
    ],
    [
        "a record with a remove event type",
        createEvent([
            createRecord(
                "REMOVE",
                SEQUENCE_NUMBER,
                CONNECTION_ID,
                BASE_URL,
                CALLBACK_URL
            ),
        ]),
    ],
    [
        "a record with a missing sequence number",
        createEvent([
            createRecord(
                "INSERT",
                undefined,
                CONNECTION_ID,
                BASE_URL,
                CALLBACK_URL
            ),
        ]),
    ],
    [
        "a record with a missing connection ID",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                undefined,
                BASE_URL,
                CALLBACK_URL
            ),
        ]),
    ],
    [
        "a record with a missing base URL",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                CONNECTION_ID,
                undefined,
                CALLBACK_URL
            ),
        ]),
    ],
    [
        "a record with a missing callback URL",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                CONNECTION_ID,
                BASE_URL,
                undefined
            ),
        ]),
    ],
    [
        "a record with an invalid callback URL",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                CONNECTION_ID,
                BASE_URL,
                "test www.example.com"
            ),
        ]),
    ],
    [
        "a record with an invalid callback URL (numeric)",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                CONNECTION_ID,
                BASE_URL,
                "1"
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

        test("does not call port to send current keyphrase state", () => {
            expect(mockPort.provideCurrentKeyphrases).not.toHaveBeenCalled();
        });

        test("returns no item failures", () => {
            expect(response).toBeDefined();
            expect(response.batchItemFailures).toHaveLength(0);
        });
    }
);

describe("given a event with both valid and invalid new connection records", () => {
    const validRecords = [
        createRecord(
            "INSERT",
            SEQUENCE_NUMBER,
            CONNECTION_ID,
            BASE_URL,
            CALLBACK_URL
        ),
    ];
    const invalidRecords = [
        createRecord(
            "MODIFY",
            SEQUENCE_NUMBER,
            OTHER_CONNECTION_ID,
            OTHER_BASE_URL,
            OTHER_CALLBACK_URL
        ),
    ];
    const event = createEvent([...validRecords, ...invalidRecords]);

    let response: SQSBatchResponse;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockPort.provideCurrentKeyphrases.mockResolvedValue([]);

        response = await adapter.handleEvent(event);
    });

    test("calls port to send current keyphrase state to valid new connections", () => {
        const expectedConnections: Connection[] = validRecords.map((record) =>
            createConnection(record)
        );

        expect(mockPort.provideCurrentKeyphrases).toHaveBeenCalledTimes(1);
        expect(mockPort.provideCurrentKeyphrases).toHaveBeenCalledWith(
            expect.arrayContaining(expectedConnections)
        );
    });

    test("returns no item failures", () => {
        expect(response).toBeDefined();
        expect(response.batchItemFailures).toHaveLength(0);
    });
});

describe.each([
    [
        "a single new connection record",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                CONNECTION_ID,
                BASE_URL,
                CALLBACK_URL
            ),
        ]),
    ],
    [
        "multiple new connection records",
        createEvent([
            createRecord(
                "INSERT",
                SEQUENCE_NUMBER,
                CONNECTION_ID,
                BASE_URL,
                CALLBACK_URL
            ),
            createRecord(
                "INSERT",
                OTHER_SEQUENCE_NUMBER,
                OTHER_CONNECTION_ID,
                OTHER_BASE_URL,
                OTHER_CALLBACK_URL
            ),
        ]),
    ],
])(
    "given a valid event with %s",
    (message: string, event: DynamoDBStreamEvent) => {
        let response: SQSBatchResponse;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockPort.provideCurrentKeyphrases.mockResolvedValue([]);

            response = await adapter.handleEvent(event);
        });

        test("calls port to send current keyphrase state to new connection", () => {
            const expectedConnections: Connection[] = event.Records.map(
                (record) => createConnection(record)
            );

            expect(mockPort.provideCurrentKeyphrases).toHaveBeenCalledTimes(1);
            expect(mockPort.provideCurrentKeyphrases).toHaveBeenCalledWith(
                expect.arrayContaining(expectedConnections)
            );
        });

        test("returns no item failures", () => {
            expect(response).toBeDefined();
            expect(response.batchItemFailures).toHaveLength(0);
        });
    }
);

test("returns corresponding sequence numbers for records if a failure occurs during the sending of keyphrase state", async () => {
    jest.resetAllMocks();
    const expectedResponse = [SEQUENCE_NUMBER, OTHER_SEQUENCE_NUMBER];
    mockPort.provideCurrentKeyphrases.mockResolvedValue([
        CONNECTION_ID,
        OTHER_CONNECTION_ID,
    ]);
    const event = createEvent([
        createRecord(
            "INSERT",
            SEQUENCE_NUMBER,
            CONNECTION_ID,
            BASE_URL,
            CALLBACK_URL
        ),
        createRecord(
            "INSERT",
            OTHER_SEQUENCE_NUMBER,
            OTHER_CONNECTION_ID,
            OTHER_BASE_URL,
            OTHER_CALLBACK_URL
        ),
    ]);

    const result = await adapter.handleEvent(event);

    expect(result.batchItemFailures).toHaveLength(expectedResponse.length);
    for (const failure of result.batchItemFailures) {
        expect(expectedResponse).toContainEqual(failure.itemIdentifier);
    }
});

test("returns corresponding sequence numbers for records if an error occurs during the sending of keyphrase state", async () => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const expectedResponse = [SEQUENCE_NUMBER, OTHER_SEQUENCE_NUMBER];
    mockPort.provideCurrentKeyphrases.mockRejectedValue(new Error());
    const event = createEvent([
        createRecord(
            "INSERT",
            SEQUENCE_NUMBER,
            CONNECTION_ID,
            BASE_URL,
            CALLBACK_URL
        ),
        createRecord(
            "INSERT",
            OTHER_SEQUENCE_NUMBER,
            OTHER_CONNECTION_ID,
            OTHER_BASE_URL,
            OTHER_CALLBACK_URL
        ),
    ]);

    const result = await adapter.handleEvent(event);

    expect(result.batchItemFailures).toHaveLength(expectedResponse.length);
    for (const failure of result.batchItemFailures) {
        expect(expectedResponse).toContainEqual(failure.itemIdentifier);
    }
});
