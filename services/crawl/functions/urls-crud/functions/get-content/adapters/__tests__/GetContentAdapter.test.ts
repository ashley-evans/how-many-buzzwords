import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { StatusCodes } from "http-status-codes";
import { ObjectValidator } from "buzzword-aws-crawl-common";

import { GetContentAdapter, ValidParameters } from "../GetContentAdapter";
import GetContentPort from "../../ports/GetContentPort";

const VALID_URL = new URL("http://www.example.com");
const EXPECTED_CONTENT = "test";

const mockPort = mock<GetContentPort>();
const mockValidator = mock<ObjectValidator<ValidParameters>>();
const adapter = new GetContentAdapter(mockPort, mockValidator);

function createEvent(url: string | URL): APIGatewayProxyEvent {
    const event = mock<APIGatewayProxyEvent>();
    if (url) {
        event.queryStringParameters = {
            url: url.toString(),
        };
    }

    return event;
}

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe.each([
    ["invalid url (numeric)", "1"],
    ["invalid url", `test ${VALID_URL.toString()}`],
])("given an event with %s", (message: string, eventURL: string) => {
    const event = createEvent(eventURL);

    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockValidator.validate.mockReturnValue({ url: eventURL });

        response = await adapter.handleRequest(event);
    });

    test("calls object validator with provided event parameters", () => {
        expect(mockValidator.validate).toHaveBeenCalledTimes(1);
        expect(mockValidator.validate).toHaveBeenCalledWith(
            event.queryStringParameters
        );
    });

    test("does not call port with invalid event", () => {
        expect(mockPort.getPageContent).toHaveBeenCalledTimes(0);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns 400 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });

    test("returns error in response body", () => {
        expect(response.body).toEqual("Invalid event");
    });
});

describe("given an event that fails validation", () => {
    const event = createEvent(VALID_URL);

    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockValidator.validate.mockImplementation(() => {
            throw new Error();
        });

        response = await adapter.handleRequest(event);
    });

    test("calls object validator with provided query parameters", () => {
        expect(mockValidator.validate).toHaveBeenCalledTimes(1);
        expect(mockValidator.validate).toHaveBeenCalledWith(
            event.queryStringParameters
        );
    });

    test("does not call port with invalid event", () => {
        expect(mockPort.getPageContent).toHaveBeenCalledTimes(0);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns 400 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });

    test("returns error in response body", () => {
        expect(response.body).toEqual("Invalid event");
    });
});

describe.each([
    ["url with protocol", VALID_URL.toString(), VALID_URL],
    ["url without protocol", VALID_URL.hostname, VALID_URL],
    [
        "url with protocol (URL encoded)",
        encodeURIComponent(VALID_URL.toString()),
        VALID_URL,
    ],
    [
        "url without protocol (Double URL encoded)",
        encodeURIComponent(VALID_URL.hostname.toString()),
        VALID_URL,
    ],
    [
        "url with query parameters (DoubleURL encoded)",
        encodeURIComponent(`${VALID_URL.hostname}/test?test=test`),
        new URL(`http://${VALID_URL.hostname}/test?test=test`),
    ],
])(
    "given a valid event with a %s that has been crawled recently",
    (message: string, eventURL: string, expectedURL: URL) => {
        const event = createEvent(eventURL);

        let response: APIGatewayProxyResult;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockValidator.validate.mockReturnValue({ url: eventURL });
            mockPort.getPageContent.mockResolvedValue(EXPECTED_CONTENT);

            response = await adapter.handleRequest(event);
        });

        test("calls object validator with provided event parameters", () => {
            expect(mockValidator.validate).toHaveBeenCalledTimes(1);
            expect(mockValidator.validate).toHaveBeenCalledWith(
                event.queryStringParameters
            );
        });

        test("calls port with URL from event", () => {
            expect(mockPort.getPageContent).toHaveBeenCalledTimes(1);
            expect(mockPort.getPageContent).toHaveBeenCalledWith(expectedURL);
        });

        test("returns 200 response", () => {
            expect(response.statusCode).toEqual(StatusCodes.OK);
        });

        test("returns plain text mime type in content type header", () => {
            expect(response.headers).toEqual(
                expect.objectContaining({
                    "Content-Type": "text/html",
                })
            );
        });

        test("returns page content in response body", () => {
            expect(response.body).toEqual(EXPECTED_CONTENT);
        });
    }
);

describe("given port rejects promise", () => {
    const event = createEvent(VALID_URL);

    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockValidator.validate.mockReturnValue({ url: VALID_URL.toString() });
        mockPort.getPageContent.mockRejectedValue(new Error());

        response = await adapter.handleRequest(event);
    });

    test("calls object validator with provided event parameters", () => {
        expect(mockValidator.validate).toHaveBeenCalledTimes(1);
        expect(mockValidator.validate).toHaveBeenCalledWith(
            event.queryStringParameters
        );
    });

    test("calls port with URL from event", () => {
        expect(mockPort.getPageContent).toHaveBeenCalledTimes(1);
        expect(mockPort.getPageContent).toHaveBeenCalledWith(VALID_URL);
    });

    test("returns plain text mime type in content type header", () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                "Content-Type": "text/plain",
            })
        );
    });

    test("returns 404 response", () => {
        expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    test("returns not crawled message in body", () => {
        expect(response.body).toEqual("No content found for given URL.");
    });
});
