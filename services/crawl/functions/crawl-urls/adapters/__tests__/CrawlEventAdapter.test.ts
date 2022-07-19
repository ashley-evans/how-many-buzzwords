import { mock } from "jest-mock-extended";

import { CrawlPort } from "../../ports/CrawlPort";
import { CrawlEvent, CrawlResponse } from "../../ports/PrimaryAdapter";
import { CrawlEventAdapter } from "../CrawlEventAdapter";

const mockCrawlPort = mock<CrawlPort>();

const adapter = new CrawlEventAdapter(mockCrawlPort);

const VALID_URL = new URL("https://www.example.com");
const EXPECTED_PATHNAMES = ["/", "/test"];

function createEvent(url?: URL | string, depth?: number): CrawlEvent {
    const event: CrawlEvent = {};
    if (url) {
        event.url = url.toString();
    }

    if (depth) {
        event.depth = depth;
    }

    return event;
}

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe.each([
    ["invalid url (numeric)", "1"],
    ["invalid url", `test ${VALID_URL}`],
])("handles invalid event with %s", (text: string, eventURL: string) => {
    const event = createEvent(eventURL);
    let response: CrawlResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        response = await adapter.crawl(event);
    });

    test("does not call crawl port", async () => {
        expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(0);
    });

    test("returns provided URL in response", () => {
        expect(response).toBeDefined();
        expect(response.baseURL).toEqual(eventURL);
    });

    test("returns failure", () => {
        expect(response).toBeDefined();
        expect(response.success).toEqual(false);
    });

    test("returns no pathnames array", () => {
        expect(response).toBeDefined();
        expect(response.pathnames).toBeUndefined();
    });
});

describe.each([
    ["(including protocol) with no depth provided", VALID_URL],
    ["(including protocol) with a max depth provided", VALID_URL, 10],
    ["(excluding protocol) with no depth provided", VALID_URL.hostname],
    ["(excluding protocol) with a max depth provided", VALID_URL.hostname, 10],
])(
    "handles a valid URL %s",
    (message: string, inputURL: URL | string, expectedDepth?: number) => {
        const event = createEvent(inputURL, expectedDepth);
        let response: CrawlResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            mockCrawlPort.crawl.mockResolvedValue({
                success: true,
                pathnames: EXPECTED_PATHNAMES,
            });

            response = await adapter.crawl(event);
        });

        test("calls crawl port with URL and depth from event", () => {
            expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(1);
            expect(mockCrawlPort.crawl).toHaveBeenCalledWith(
                VALID_URL,
                expectedDepth
            );
        });

        test("returns base URL in response", () => {
            expect(response).toBeDefined();
            expect(response.baseURL).toEqual(VALID_URL.hostname);
        });

        test("returns success given crawl succeeds", () => {
            expect(response).toBeDefined();
            expect(response.success).toEqual(true);
        });

        test("returns pathnames returned from crawler", () => {
            expect(response).toBeDefined();
            expect(response.pathnames).toEqual(EXPECTED_PATHNAMES);
        });
    }
);

describe("error handling", () => {
    const event = createEvent(VALID_URL);

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test("throws crawl error if error occurs during crawl", async () => {
        mockCrawlPort.crawl.mockRejectedValue(new Error());

        expect.assertions(1);
        await expect(adapter.crawl(event)).rejects.toEqual(
            expect.objectContaining({
                name: "CrawlError",
            })
        );
    });

    test("returns crawl error if crawl returns failure with pathnames", async () => {
        mockCrawlPort.crawl.mockResolvedValue({
            success: false,
            pathnames: EXPECTED_PATHNAMES,
        });

        expect.assertions(1);
        await expect(adapter.crawl(event)).rejects.toEqual(
            expect.objectContaining({
                name: "CrawlError",
                message: expect.stringContaining(EXPECTED_PATHNAMES.toString()),
            })
        );
    });

    test("returns crawl error if crawl returns failure with no pathnames", async () => {
        mockCrawlPort.crawl.mockResolvedValue({
            success: false,
            pathnames: undefined,
        });

        expect.assertions(1);
        await expect(adapter.crawl(event)).rejects.toEqual(
            expect.objectContaining({
                name: "CrawlError",
                message: expect.stringContaining("No pages"),
            })
        );
    });
});
