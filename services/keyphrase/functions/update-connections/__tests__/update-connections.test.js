const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const {
    ApiGatewayManagementApiClient,
} = require("@aws-sdk/client-apigatewaymanagementapi");
const { mockClient } = require("aws-sdk-client-mock");
const {
    dynamoDBEventTypes,
    apiGatewayExceptionMessages,
    activeConnectionsTableKeyFields,
} = require("../constants");

const TABLE_NAME = "test";
const INDEX_NAME = "test_index";
const SEARCH_KEY = "BaseUrl";
const EXPECTED_SEARCH_KEY_VALUE = "valid_key";
const EXPECTED_CONNECTION_ENDPOINT = "https://test.test.com/prod";
const EXPECTED_CONNECTION_ID = "Gyvd8cAwLPECHlQ=";

process.env.TABLE_NAME = TABLE_NAME;
process.env.INDEX_NAME = INDEX_NAME;
process.env.SEARCH_KEY = SEARCH_KEY;

const ddbMock = mockClient(DynamoDBClient);
const apiMock = mockClient(ApiGatewayManagementApiClient);

const { handler } = require("../update-connections");

const createEvent = (...records) => {
    return {
        Records: records,
    };
};

const createRecord = (eventName, dbKeyField, dbNewImageFields) => {
    return {
        eventName,
        dynamodb: {
            Keys: dbKeyField,
            NewImage: dbNewImageFields,
        },
    };
};

const createSearchKeyField = (value) => {
    return {
        [SEARCH_KEY]: { S: value },
    };
};

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
});

describe("input validation", () => {
    test.each([
        ["event with missing records", { Records: undefined }],
        [
            "record with missing dynamoDB field",
            createEvent({
                dynamodb: undefined,
                eventName: dynamoDBEventTypes.INSERT_EVENT_NAME,
            }),
        ],
        [
            "record with missing keys field",
            createEvent({
                dynamodb: {},
                eventName: dynamoDBEventTypes.INSERT_EVENT_NAME,
            }),
        ],
        [
            "keys field with missing search key",
            createEvent(
                createRecord(
                    dynamoDBEventTypes.INSERT_EVENT_NAME,
                    createSearchKeyField()
                )
            ),
        ],
        [
            "new image field with missing search key",
            createEvent(
                createRecord(
                    dynamoDBEventTypes.INSERT_EVENT_NAME,
                    createSearchKeyField(EXPECTED_SEARCH_KEY_VALUE),
                    createSearchKeyField()
                )
            ),
        ],
    ])("returns failed validation error given %s", async (message, event) => {
        await expect(handler(event)).rejects.toThrowError(
            "Event object failed validation"
        );
    });
});

describe.each([
    [
        "a single insert connection stream event",
        createEvent(
            createRecord(
                dynamoDBEventTypes.INSERT_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`),
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`)
            )
        ),
    ],
    [
        "multiple insert connection stream events",
        createEvent(
            createRecord(
                dynamoDBEventTypes.INSERT_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`),
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`)
            ),
            createRecord(
                dynamoDBEventTypes.INSERT_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}2`),
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}2`)
            )
        ),
    ],
    [
        "a single modify connection stream event",
        createEvent(
            createRecord(
                dynamoDBEventTypes.MODIFY_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`),
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`)
            )
        ),
    ],
    [
        "multiple modify connection stream events",
        createEvent(
            createRecord(
                dynamoDBEventTypes.MODIFY_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`),
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`)
            ),
            createRecord(
                dynamoDBEventTypes.MODIFY_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}2`),
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}2`)
            )
        ),
    ],
])("update path: %s", (message, event) => {
    beforeAll(async () => {
        for (const record of event.Records) {
            const searchKeyValue = record.dynamodb.Keys[SEARCH_KEY].S;
            ddbMock
                .on(QueryCommand, {
                    TableName: TABLE_NAME,
                    IndexName: INDEX_NAME,
                    KeyConditionExpression: "#sk = :searchvalue",
                    ExpressionAttributeNames: {
                        "#sk": activeConnectionsTableKeyFields.SECONDARY_INDEX_HASH,
                    },
                    ExpressionAttributeValues: {
                        ":searchvalue": { S: searchKeyValue },
                    },
                })
                .resolves({
                    Items: [
                        {
                            SearchKey: { S: searchKeyValue },
                            ConnectionId: { S: EXPECTED_CONNECTION_ID },
                            ConnectionEndpoint: {
                                S: EXPECTED_CONNECTION_ENDPOINT,
                            },
                        },
                    ],
                });
        }

        await handler(event);
    });

    test("queries dynamodb with search value", () => {
        const dynamoDbCallsInputs = ddbMock
            .calls()
            .map((call) => call.args[0].input);

        expect(dynamoDbCallsInputs).toHaveLength(event.Records.length);

        for (const record of event.Records) {
            const searchKeyValue = record.dynamodb.Keys[SEARCH_KEY].S;
            expect(dynamoDbCallsInputs).toContainEqual({
                TableName: TABLE_NAME,
                IndexName: INDEX_NAME,
                KeyConditionExpression: "#sk = :searchvalue",
                ExpressionAttributeNames: {
                    "#sk": activeConnectionsTableKeyFields.SECONDARY_INDEX_HASH,
                },
                ExpressionAttributeValues: {
                    ":searchvalue": { S: searchKeyValue },
                },
            });
        }
    });

    test("sends results from dynamodb to connection endpoint and id", () => {
        const apiGatewayCallsInputs = apiMock
            .calls()
            .map((call) => call.args[0].input);

        expect(apiGatewayCallsInputs).toHaveLength(event.Records.length);

        for (const record of event.Records) {
            expect(apiGatewayCallsInputs).toContainEqual({
                ConnectionId: EXPECTED_CONNECTION_ID,
                Data: JSON.stringify({
                    eventName: record.eventName,
                    value: record.dynamodb.NewImage,
                }),
            });
        }
    });

    afterAll(() => {
        ddbMock.reset();
        apiMock.reset();
    });
});

describe.each([
    [
        "a single remove connection stream event",
        createEvent(
            createRecord(
                dynamoDBEventTypes.REMOVE_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`)
            )
        ),
    ],
    [
        "multiple remove connection stream events",
        createEvent(
            createRecord(
                dynamoDBEventTypes.REMOVE_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}1`)
            ),
            createRecord(
                dynamoDBEventTypes.REMOVE_EVENT_NAME,
                createSearchKeyField(`${EXPECTED_SEARCH_KEY_VALUE}2`)
            )
        ),
    ],
])("remove path: %s", (message, event) => {
    beforeAll(async () => {
        for (const record of event.Records) {
            const searchKeyValue = record.dynamodb.Keys[SEARCH_KEY].S;
            ddbMock
                .on(QueryCommand, {
                    TableName: TABLE_NAME,
                    IndexName: INDEX_NAME,
                    KeyConditionExpression: "#sk = :searchvalue",
                    ExpressionAttributeNames: {
                        "#sk": activeConnectionsTableKeyFields.SECONDARY_INDEX_HASH,
                    },
                    ExpressionAttributeValues: {
                        ":searchvalue": { S: searchKeyValue },
                    },
                })
                .resolves({
                    Items: [
                        {
                            SearchKey: { S: searchKeyValue },
                            ConnectionId: { S: EXPECTED_CONNECTION_ID },
                            ConnectionEndpoint: {
                                S: EXPECTED_CONNECTION_ENDPOINT,
                            },
                        },
                    ],
                });
        }

        await handler(event);
    });

    test("queries dynamodb with search value", () => {
        const dynamoDbCallsInputs = ddbMock
            .calls()
            .map((call) => call.args[0].input);

        expect(dynamoDbCallsInputs).toHaveLength(event.Records.length);

        for (const record of event.Records) {
            const searchKeyValue = record.dynamodb.Keys[SEARCH_KEY].S;
            expect(dynamoDbCallsInputs).toContainEqual({
                TableName: TABLE_NAME,
                IndexName: INDEX_NAME,
                KeyConditionExpression: "#sk = :searchvalue",
                ExpressionAttributeNames: {
                    "#sk": activeConnectionsTableKeyFields.SECONDARY_INDEX_HASH,
                },
                ExpressionAttributeValues: {
                    ":searchvalue": { S: searchKeyValue },
                },
            });
        }
    });

    test("sends results from dynamodb to connection endpoint and id", () => {
        const apiGatewayCallsInputs = apiMock
            .calls()
            .map((call) => call.args[0].input);

        expect(apiGatewayCallsInputs).toHaveLength(event.Records.length);

        for (const record of event.Records) {
            expect(apiGatewayCallsInputs).toContainEqual({
                ConnectionId: EXPECTED_CONNECTION_ID,
                Data: JSON.stringify({
                    eventName: record.eventName,
                    value: record.dynamodb.Keys,
                }),
            });
        }
    });

    afterAll(() => {
        ddbMock.reset();
        apiMock.reset();
    });
});

describe("Error handling", () => {
    const event = createEvent(
        createRecord(
            dynamoDBEventTypes.REMOVE_EVENT_NAME,
            createSearchKeyField(EXPECTED_SEARCH_KEY_VALUE)
        )
    );

    test("handler removes client from dynamodb when client no longer available", async () => {
        const expectedErrorMessage = apiGatewayExceptionMessages.GONE_EXCEPTION;

        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    [SEARCH_KEY]: {
                        S: EXPECTED_SEARCH_KEY_VALUE,
                    },
                    ConnectionId: { S: EXPECTED_CONNECTION_ID },
                    ConnectionEndpoint: {
                        S: EXPECTED_CONNECTION_ENDPOINT,
                    },
                },
            ],
        });
        apiMock.rejects(expectedErrorMessage);

        await handler(event);
        const dynamoDbCallsInputs = ddbMock
            .calls()
            .map((call) => call.args[0].input);

        expect(dynamoDbCallsInputs).toContainEqual({
            TableName: TABLE_NAME,
            Key: {
                ConnectionId: EXPECTED_CONNECTION_ID,
            },
        });
    });

    test("handler throws exception when api post fails for unexpected reason", async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    [SEARCH_KEY]: {
                        S: EXPECTED_SEARCH_KEY_VALUE,
                    },
                    ConnectionId: { S: EXPECTED_CONNECTION_ID },
                    ConnectionEndpoint: {
                        S: EXPECTED_CONNECTION_ENDPOINT,
                    },
                },
            ],
        });
        apiMock.rejects();

        await expect(handler(event)).rejects.toThrowError();
    });

    test("handler throws exception when database query errors for any reason", async () => {
        ddbMock.rejects();

        await expect(handler(event)).rejects.toThrowError();
    });

    afterEach(() => {
        ddbMock.reset();
        apiMock.reset();
    });
});
