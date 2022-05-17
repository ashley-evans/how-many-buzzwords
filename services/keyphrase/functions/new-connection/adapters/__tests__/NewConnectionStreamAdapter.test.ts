import { mock } from "jest-mock-extended";
import {
    DynamoDBStreamEvent,
    DynamoDBRecord,
    SQSBatchResponse,
} from "aws-lambda";
import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "buzzword-aws-active-connections-repository-library/enums/ActiveConnectionsTableFields";

import NewConnectionStreamAdapter from "../NewConnectionStreamAdapter";
import { NewConnectionPort } from "../../ports/NewConnectionPort";

const mockPort = mock<NewConnectionPort>();

const adapter = new NewConnectionStreamAdapter(mockPort);

const CONNECTION_ID = "test_connection_id";
const CALLBACK_URL = new URL("https://www.callback.com/");
const BASE_URL = "www.example.com";

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

test.each([["missing records", createEvent()]])(
    "throws exception given an event with %s",
    async (message: string, event: DynamoDBStreamEvent) => {
        jest.resetAllMocks();

        expect.assertions(2);
        await expect(adapter.handleEvent(event)).rejects.toEqual(
            expect.objectContaining({
                message: expect.stringContaining(
                    "Exception occurred during event validation:"
                ),
            })
        );

        expect(mockPort.provideCurrentKeyphrases).not.toHaveBeenCalled();
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

        test("returns no item failures", () => {
            expect(response).toBeDefined();
            expect(response.batchItemFailures).toHaveLength(0);
        });
    }
);
