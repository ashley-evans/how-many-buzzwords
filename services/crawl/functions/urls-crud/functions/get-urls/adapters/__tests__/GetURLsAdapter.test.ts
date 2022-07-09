import { mock } from "jest-mock-extended";
import { AppSyncResolverEvent } from "aws-lambda";

import { GetURLsPort, PathnameResponse } from "../../ports/GetURLsPort";
import { QueryUrlsArgs, Url } from "../../../../../../schemas/schema";
import GetURLsAdapter from "../GetURLsAdapter";

const VALID_URL = new URL("http://www.example.com");

const mockPort = mock<GetURLsPort>();
const adapter = new GetURLsAdapter(mockPort);

function createEvent(
    baseURL: URL | string
): AppSyncResolverEvent<QueryUrlsArgs> {
    const event = mock<AppSyncResolverEvent<QueryUrlsArgs>>();
    event.arguments = {
        id: baseURL.toString(),
    };

    return event;
}

function createPathname(pathname: string): PathnameResponse {
    return {
        pathname,
        crawledAt: new Date(),
    };
}

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe.each([
    ["invalid url (numeric)", "1"],
    ["invalid url", `test ${VALID_URL.toString()}`],
])("given an event with %s", (message: string, eventURL: string) => {
    const event = createEvent(eventURL);

    beforeEach(async () => {
        jest.resetAllMocks();
    });

    test("throws an error", async () => {
        const expectedError = "Invalid ID provided, not a URL.";

        await expect(adapter.handleQuery(event)).rejects.toThrowError(
            expectedError
        );
    });

    test("does not call port to get crawled URLs", async () => {
        try {
            await adapter.handleQuery(event);
        } catch {
            // Expected error
        }

        expect(mockPort.getPathnames).toHaveBeenCalledTimes(0);
    });
});

describe.each([
    ["url with protocol", VALID_URL.toString()],
    ["url without protocol", VALID_URL.hostname],
])(
    "given a valid event with a %s that has not been crawled recently",
    (message: string, url: string) => {
        const event = createEvent(url);

        let response: Url | undefined;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockPort.getPathnames.mockResolvedValue([]);

            response = await adapter.handleQuery(event);
        });

        test("calls port with url from query arguments", () => {
            expect(mockPort.getPathnames).toHaveBeenCalledTimes(1);
            expect(mockPort.getPathnames).toHaveBeenCalledWith(VALID_URL);
        });

        test("returns undefined", () => {
            expect(response).toBeUndefined();
        });
    }
);

describe.each([
    ["url with protocol", VALID_URL.toString()],
    ["url without protocol", VALID_URL.hostname],
])(
    "given a valid event with a %s that has been crawled recently",
    (message: string, url: string) => {
        const event = createEvent(url);
        const crawledPaths = [createPathname("/"), createPathname("/wibble")];

        let response: Url | undefined;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockPort.getPathnames.mockResolvedValue(crawledPaths);

            response = await adapter.handleQuery(event);
        });

        test("calls port with url from query arguments", () => {
            expect(mockPort.getPathnames).toHaveBeenCalledTimes(1);
            expect(mockPort.getPathnames).toHaveBeenCalledWith(VALID_URL);
        });

        test("returns the provided URL's hostname as the response ID", () => {
            expect(response?.id).toEqual(VALID_URL.hostname);
        });

        test("returns each pathname crawled", () => {
            for (const expected of crawledPaths) {
                expect(response?.pathnames).toContainEqual(
                    expect.objectContaining({
                        name: expected.pathname,
                    })
                );
            }
        });

        test("returns crawled time as ISO 8601 date time", () => {
            for (const expected of crawledPaths) {
                const expectedDate = expected.crawledAt.toISOString();
                expect(response?.pathnames).toContainEqual(
                    expect.objectContaining({
                        crawledAt: expectedDate,
                    })
                );
            }
        });
    }
);

test("given an error occurs retrieving crawled paths", async () => {
    jest.resetAllMocks();
    const event = createEvent(VALID_URL);
    mockPort.getPathnames.mockRejectedValue(new Error());

    await expect(adapter.handleQuery(event)).rejects.toThrowError(
        "An error occurred while obtaining crawled paths"
    );
});
