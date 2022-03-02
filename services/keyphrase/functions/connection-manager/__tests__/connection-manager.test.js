const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { mockClient } = require("aws-sdk-client-mock");
const { StatusCodes } = require("http-status-codes");

const { CONNECT_ROUTE_KEY, DISCONNECT_ROUTE_KEY } = require("../constants");

const EXPECTED_CONNECTION_ID = "Gyvd8cAwLPECHlQ=";
const EXPECTED_DOMAIN_NAME = "test.test.com";
const EXPECTED_STAGE = "test";
const EXPECTED_SEARCH_KEY = "valid_key";

const TABLE_NAME = "test";
process.env.TABLE_NAME = TABLE_NAME;
process.env.ERROR_LOGGING_ENABLED = false;
const SEARCH_KEY = "BaseUrl";
process.env.SEARCH_KEY = SEARCH_KEY;
process.env.SEARCH_KEY_PATTERN = EXPECTED_SEARCH_KEY;

const ddbMock = mockClient(DynamoDBClient);

const { handler } = require("../connection-manager");

const createRequestContext = (connectionId, domainName, stage, routeKey) => {
    return {
        connectionId,
        domainName,
        stage,
        routeKey,
    };
};

const createEvent = (requestContext, searchKey) => {
    return {
        queryStringParameters: {
            [SEARCH_KEY]: searchKey,
        },
        requestContext,
    };
};

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
});

beforeEach(() => {
    ddbMock.reset();
});

describe("input validation", () => {
    test.each([
        [
            "queryStringParameters with missing search key",
            createEvent(
                createRequestContext(
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_DOMAIN_NAME,
                    EXPECTED_STAGE,
                    CONNECT_ROUTE_KEY
                )
            ),
        ],
        [
            "queryStringParameters with invalid search key",
            createEvent(
                createRequestContext(
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_DOMAIN_NAME,
                    EXPECTED_STAGE,
                    CONNECT_ROUTE_KEY
                ),
                "not a valid search key"
            ),
        ],
        [
            "event with missing requestContext",
            {
                queryStringParameters: {
                    baseUrl: EXPECTED_SEARCH_KEY,
                },
            },
        ],
        [
            "event with non-object requestContext",
            createEvent("", EXPECTED_SEARCH_KEY),
        ],
        [
            "requestContext with missing connectionId",
            createEvent(
                createRequestContext(
                    undefined,
                    EXPECTED_DOMAIN_NAME,
                    EXPECTED_STAGE,
                    CONNECT_ROUTE_KEY
                ),
                EXPECTED_SEARCH_KEY
            ),
        ],
        [
            "requestContext with missing domainName",
            createEvent(
                createRequestContext(
                    EXPECTED_CONNECTION_ID,
                    undefined,
                    EXPECTED_STAGE,
                    CONNECT_ROUTE_KEY
                ),
                EXPECTED_SEARCH_KEY
            ),
        ],
        [
            "requestContext with invalid domainName",
            createEvent(
                createRequestContext(
                    EXPECTED_CONNECTION_ID,
                    "not a domain",
                    EXPECTED_STAGE,
                    CONNECT_ROUTE_KEY
                ),
                EXPECTED_SEARCH_KEY
            ),
        ],
        [
            "requestContext with missing stage",
            createEvent(
                createRequestContext(
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_DOMAIN_NAME,
                    undefined,
                    CONNECT_ROUTE_KEY
                ),
                EXPECTED_SEARCH_KEY
            ),
        ],
        [
            "requestContext with missing routeKey",
            createEvent(
                createRequestContext(
                    EXPECTED_CONNECTION_ID,
                    EXPECTED_DOMAIN_NAME,
                    EXPECTED_STAGE,
                    undefined
                ),
                EXPECTED_SEARCH_KEY
            ),
        ],
    ])("returns failed validation error given %s", async (message, input) => {
        const response = await handler(input);

        expect(response).toBeDefined();
        expect(response.body).toEqual("Event object failed validation");
        expect(response.headers).toEqual({
            "Content-Type": "text/plain",
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });
});

test("connect event returns success on successful connection store", async () => {
    const event = createEvent(
        createRequestContext(
            EXPECTED_CONNECTION_ID,
            EXPECTED_DOMAIN_NAME,
            EXPECTED_STAGE,
            CONNECT_ROUTE_KEY
        ),
        EXPECTED_SEARCH_KEY
    );

    const response = await handler(event);

    expect(response).toBeDefined();
    expect(response.statusCode).toEqual(StatusCodes.OK);
    expect(response.headers).toEqual({
        "Content-Type": "text/plain",
    });
    expect(response.body).toEqual("Connected successfully.");
});

test("connect event stores connection details in DynamoDB table", async () => {
    const event = createEvent(
        createRequestContext(
            EXPECTED_CONNECTION_ID,
            EXPECTED_DOMAIN_NAME,
            EXPECTED_STAGE,
            CONNECT_ROUTE_KEY
        ),
        EXPECTED_SEARCH_KEY
    );
    const expectedEndpoint = `https://${EXPECTED_DOMAIN_NAME}/${EXPECTED_STAGE}`;

    await handler(event);
    const dynamoDbCallsInputs = ddbMock
        .calls()
        .map((call) => call.args[0].input);

    expect(dynamoDbCallsInputs).toHaveLength(1);
    expect(dynamoDbCallsInputs).toContainEqual({
        TableName: TABLE_NAME,
        Item: {
            ConnectionId: {
                S: EXPECTED_CONNECTION_ID,
            },
            ConnectionEndpoint: {
                S: expectedEndpoint,
            },
            SearchKey: {
                S: EXPECTED_SEARCH_KEY,
            },
        },
    });
});

test.each([
    ["connect event", CONNECT_ROUTE_KEY],
    ["other event", "test"],
])(
    "%s does not delete connection information from DynamoDB table",
    async (message, routeKey) => {
        const event = createEvent(
            createRequestContext(
                EXPECTED_CONNECTION_ID,
                EXPECTED_DOMAIN_NAME,
                EXPECTED_STAGE,
                routeKey
            ),
            EXPECTED_SEARCH_KEY
        );

        await handler(event);
        const dynamoDbCallsInputs = ddbMock
            .calls()
            .map((call) => call.args[0].input);

        expect(dynamoDbCallsInputs).not.toContainEqual({
            TableName: TABLE_NAME,
            Key: {
                ConnectionId: {
                    S: EXPECTED_CONNECTION_ID,
                },
            },
        });
    }
);

test("disconnect event returns success on successful connection deletion", async () => {
    const event = createEvent(
        createRequestContext(
            EXPECTED_CONNECTION_ID,
            EXPECTED_DOMAIN_NAME,
            EXPECTED_STAGE,
            DISCONNECT_ROUTE_KEY
        ),
        EXPECTED_SEARCH_KEY
    );

    const response = await handler(event);

    expect(response).toBeDefined();
    expect(response.statusCode).toEqual(StatusCodes.OK);
    expect(response.headers).toEqual({
        "Content-Type": "text/plain",
    });
    expect(response.body).toEqual("Disconnected successfully.");
});

test("disconnect event deletes connection information from DynamoDB table", async () => {
    const event = createEvent(
        createRequestContext(
            EXPECTED_CONNECTION_ID,
            EXPECTED_DOMAIN_NAME,
            EXPECTED_STAGE,
            DISCONNECT_ROUTE_KEY
        ),
        EXPECTED_SEARCH_KEY
    );

    await handler(event);
    const dynamoDbCallsInputs = ddbMock
        .calls()
        .map((call) => call.args[0].input);

    expect(dynamoDbCallsInputs).toHaveLength(1);
    expect(dynamoDbCallsInputs).toContainEqual({
        TableName: TABLE_NAME,
        Key: {
            ConnectionId: {
                S: EXPECTED_CONNECTION_ID,
            },
        },
    });
});

test.each([
    ["disconnect event", DISCONNECT_ROUTE_KEY],
    ["other event", "test"],
])(
    "%s does not store connection details in DynamoDB table",
    async (message, routeKey) => {
        const event = createEvent(
            createRequestContext(
                EXPECTED_CONNECTION_ID,
                EXPECTED_DOMAIN_NAME,
                EXPECTED_STAGE,
                routeKey
            ),
            EXPECTED_SEARCH_KEY
        );
        const expectedEndpoint = `https://${EXPECTED_DOMAIN_NAME}/${EXPECTED_STAGE}`;

        await handler(event);
        const dynamoDbCallsInputs = ddbMock
            .calls()
            .map((call) => call.args[0].input);

        expect(dynamoDbCallsInputs).not.toContainEqual({
            TableName: TABLE_NAME,
            Item: {
                ConnectionId: {
                    S: EXPECTED_CONNECTION_ID,
                },
                ConnectionEndpoint: {
                    S: expectedEndpoint,
                },
                SearchKey: {
                    S: EXPECTED_SEARCH_KEY,
                },
            },
        });
    }
);

test.each([
    ["connect event", CONNECT_ROUTE_KEY],
    ["disconnect event", DISCONNECT_ROUTE_KEY],
])(
    "%s returns internal server error on DynamoDB error",
    async (message, routeKey) => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        const event = createEvent(
            createRequestContext(
                EXPECTED_CONNECTION_ID,
                EXPECTED_DOMAIN_NAME,
                EXPECTED_STAGE,
                routeKey
            ),
            EXPECTED_SEARCH_KEY
        );

        ddbMock.rejects();

        const response = await handler(event);

        expect(response).toBeDefined();
        expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.headers).toEqual({
            "Content-Type": "text/plain",
        });
        expect(response.body).toEqual("Failed to process connection.");
    }
);

test("other event returns bad request error", async () => {
    const event = createEvent(
        createRequestContext(
            EXPECTED_CONNECTION_ID,
            EXPECTED_DOMAIN_NAME,
            EXPECTED_STAGE,
            "test"
        ),
        EXPECTED_SEARCH_KEY
    );

    const response = await handler(event);

    expect(response).toBeDefined();
    expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(response.headers).toEqual({
        "Content-Type": "text/plain",
    });
    expect(response.body).toEqual("Cannot process connection.");
});
