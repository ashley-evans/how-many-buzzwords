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
    }

    console.log(event);

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

describe.each([["base URL with protocol", BASE_URL]])(
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
