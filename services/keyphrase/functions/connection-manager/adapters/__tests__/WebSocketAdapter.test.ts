import { mock } from "jest-mock-extended";

import ConnectionManagerPort from "../../ports/ConnectionManagerPort";
import { WebSocketAdapter, ValidRouteKeys } from "../WebSocketAdapter";
import {
    APIGatewayEventDefaultAuthorizerContext,
    APIGatewayEventRequestContextWithAuthorizer,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";
import { StatusCodes } from "http-status-codes";

const mockPort = mock<ConnectionManagerPort>();

const adapter = new WebSocketAdapter(mockPort);

const CONNECTION_ID = "test_connection_id";
const CALLBACK_DOMAIN = "www.callback.com";
const CALLBACK_STAGE = "test";
const EXPECTED_CALLBACK_URL = new URL(
    `https://${CALLBACK_DOMAIN}/${CALLBACK_STAGE}`
);
const BASE_URL = new URL("https://www.example.com/");

function createEvent(
    connectionID?: string,
    domainName?: string,
    stage?: string,
    routeKey?: ValidRouteKeys | string,
    baseURL?: URL | string
): APIGatewayProxyEvent {
    const event = mock<APIGatewayProxyEvent>();

    const requestContext =
        mock<
            APIGatewayEventRequestContextWithAuthorizer<APIGatewayEventDefaultAuthorizerContext>
        >();
    requestContext.connectionId = connectionID;
    requestContext.domainName = domainName;
    requestContext.routeKey = routeKey;
    if (stage) {
        requestContext.stage = stage;
    }

    event.requestContext = requestContext;
    if (baseURL) {
        event.queryStringParameters = {
            baseURL: baseURL.toString(),
        };
    } else {
        event.queryStringParameters = null;
    }

    return event;
}

describe.each([
    [
        "a missing connection ID",
        createEvent(
            undefined,
            CALLBACK_DOMAIN,
            CALLBACK_STAGE,
            ValidRouteKeys.connect,
            BASE_URL
        ),
    ],
    [
        "a missing callback domain name",
        createEvent(
            CONNECTION_ID,
            undefined,
            CALLBACK_STAGE,
            ValidRouteKeys.connect,
            BASE_URL
        ),
    ],
    [
        "a missing callback stage name",
        createEvent(
            CONNECTION_ID,
            CALLBACK_DOMAIN,
            undefined,
            ValidRouteKeys.connect,
            BASE_URL
        ),
    ],
    [
        "a missing route key",
        createEvent(
            CONNECTION_ID,
            CALLBACK_DOMAIN,
            CALLBACK_STAGE,
            undefined,
            BASE_URL
        ),
    ],
    [
        "an invalid route key",
        createEvent(
            CONNECTION_ID,
            CALLBACK_DOMAIN,
            CALLBACK_STAGE,
            "test invalid route key",
            BASE_URL
        ),
    ],
    [
        "a missing base URL on a new connection request",
        createEvent(
            CONNECTION_ID,
            CALLBACK_DOMAIN,
            CALLBACK_STAGE,
            ValidRouteKeys.connect,
            undefined
        ),
    ],
    [
        "an invalid base URL",
        createEvent(
            CONNECTION_ID,
            CALLBACK_DOMAIN,
            CALLBACK_STAGE,
            ValidRouteKeys.connect,
            "test www.example.com"
        ),
    ],
    [
        "an invalid base URL (numeric)",
        createEvent(
            CONNECTION_ID,
            CALLBACK_DOMAIN,
            CALLBACK_STAGE,
            ValidRouteKeys.connect,
            "1"
        ),
    ],
])("given an event with %s", (message: string, event: APIGatewayProxyEvent) => {
    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();

        response = await adapter.handleRequest(event);
    });

    test("does not call port to store invalid connection details", () => {
        expect(mockPort.storeConnection).not.toHaveBeenCalled();
    });

    test("returns 400 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns error in response body", () => {
        expect(response.body).toEqual("Invalid event");
    });
});

describe.each([
    ["base URL with https protocol", BASE_URL],
    ["base URL with http protocol", new URL("http://www.example.com")],
    ["base URL without protocol", BASE_URL.hostname],
])(
    "given a valid new connection event with a %s",
    (message: string, baseURL: URL | string) => {
        const event = createEvent(
            CONNECTION_ID,
            CALLBACK_DOMAIN,
            CALLBACK_STAGE,
            ValidRouteKeys.connect,
            baseURL
        );

        let response: APIGatewayProxyResult;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockPort.storeConnection.mockResolvedValue(true);

            response = await adapter.handleRequest(event);
        });

        test("calls port to store new connection details", () => {
            const expectedBaseURL =
                baseURL instanceof URL
                    ? baseURL
                    : new URL(`https://${baseURL}`);

            expect(mockPort.storeConnection).toBeCalledTimes(1);
            expect(mockPort.storeConnection).toHaveBeenCalledWith(
                CONNECTION_ID,
                EXPECTED_CALLBACK_URL,
                expectedBaseURL
            );
        });

        test("does not call port to remove connection details", () => {
            expect(mockPort.deleteConnection).not.toHaveBeenCalled();
        });

        test("returns 200 response", () => {
            expect(response.statusCode).toEqual(StatusCodes.OK);
        });

        test("returns plain text mime type in content type header", () => {
            expect(response.headers).toEqual(
                expect.objectContaining({
                    "Content-Type": "text/plain",
                })
            );
        });

        test("returns success message in response body", () => {
            expect(response.body).toEqual("Successfully connected.");
        });
    }
);

describe("given the new connection details fail to be stored", () => {
    const event = createEvent(
        CONNECTION_ID,
        CALLBACK_DOMAIN,
        CALLBACK_STAGE,
        ValidRouteKeys.connect,
        BASE_URL
    );

    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockPort.storeConnection.mockResolvedValue(false);

        response = await adapter.handleRequest(event);
    });

    test("returns 500 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns failure message in response body", () => {
        expect(response.body).toEqual(
            "Failed to store connection information."
        );
    });
});

describe("given an error occurs during the storage of the new connection details", () => {
    const event = createEvent(
        CONNECTION_ID,
        CALLBACK_DOMAIN,
        CALLBACK_STAGE,
        ValidRouteKeys.connect,
        BASE_URL
    );

    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockPort.storeConnection.mockRejectedValue(new Error());

        response = await adapter.handleRequest(event);
    });

    test("returns 500 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns failure message in response body", () => {
        expect(response.body).toEqual(
            "An error occurred during storage of connection information."
        );
    });
});

describe("given a valid disconnect event", () => {
    const event = createEvent(
        CONNECTION_ID,
        CALLBACK_DOMAIN,
        CALLBACK_STAGE,
        ValidRouteKeys.disconnect
    );

    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockPort.deleteConnection.mockResolvedValue(true);

        response = await adapter.handleRequest(event);
    });

    test("calls port to remove connection details", () => {
        expect(mockPort.deleteConnection).toBeCalledTimes(1);
        expect(mockPort.deleteConnection).toHaveBeenCalledWith(CONNECTION_ID);
    });

    test("does not call port to add new connection details", () => {
        expect(mockPort.storeConnection).not.toHaveBeenCalled();
    });

    test("returns 200 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.OK);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns success message in response body", () => {
        expect(response.body).toEqual("Successfully disconnected.");
    });
});

describe("given the connection deletion fails", () => {
    const event = createEvent(
        CONNECTION_ID,
        CALLBACK_DOMAIN,
        CALLBACK_STAGE,
        ValidRouteKeys.disconnect
    );

    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockPort.deleteConnection.mockResolvedValue(false);

        response = await adapter.handleRequest(event);
    });

    test("returns 500 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns failure message in response body", () => {
        expect(response.body).toEqual("Failed to disconnect.");
    });
});

describe("given an error occurs during the deletion of the connection", () => {
    const event = createEvent(
        CONNECTION_ID,
        CALLBACK_DOMAIN,
        CALLBACK_STAGE,
        ValidRouteKeys.disconnect
    );

    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockPort.deleteConnection.mockRejectedValue(new Error());

        response = await adapter.handleRequest(event);
    });

    test("returns 500 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns failure message in response body", () => {
        expect(response.body).toEqual(
            "An error occurred during disconnection."
        );
    });
});
