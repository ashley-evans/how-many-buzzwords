import { mock } from "jest-mock-extended";
import {
    DynamoDBStreamEvent,
    DynamoDBRecord,
    SQSBatchResponse,
} from "aws-lambda";
import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "buzzword-aws-active-connections-repository-library";

import NewConnectionStreamAdapter from "../NewConnectionStreamAdapter";
import { NewConnectionPort, Connection } from "../../ports/NewConnectionPort";

const mockPort = mock<NewConnectionPort>();

const adapter = new NewConnectionStreamAdapter(mockPort);

const CONNECTION_ID = "test_connection_id";
const CALLBACK_URL = new URL("https://www.callback.com/");
const BASE_URL = "www.example.com";

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
    connectionID?: string,
    baseURL?: string,
    callbackURL?: URL
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
        "a record with a modify event type",
        createEvent([
            createRecord("MODIFY", CONNECTION_ID, BASE_URL, CALLBACK_URL),
        ]),
    ],
    [
        "a record with a remove event type",
        createEvent([
            createRecord("REMOVE", CONNECTION_ID, BASE_URL, CALLBACK_URL),
        ]),
    ],
    [
        "a record with a missing connection ID",
        createEvent([
            createRecord("INSERT", undefined, BASE_URL, CALLBACK_URL),
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

describe.each([
    [
        "a single new connection record",
        createEvent([
            createRecord("INSERT", CONNECTION_ID, BASE_URL, CALLBACK_URL),
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
