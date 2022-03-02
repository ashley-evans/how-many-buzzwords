import { ObjectValidator } from "buzzword-aws-crawl-common";
import { mock } from "jest-mock-extended";

import { CrawlPort } from "../../ports/CrawlPort";
import { CrawlEvent, CrawlResponse } from "../../ports/PrimaryAdapter";
import { CrawlEventAdapter, ValidCrawlEvent } from "../CrawlEventAdapter";

const mockCrawlPort = mock<CrawlPort>();
const mockValidator = mock<ObjectValidator<ValidCrawlEvent>>();

const adapter = new CrawlEventAdapter(mockCrawlPort, mockValidator);

const EXPECTED_VALID_URL = new URL("http://www.example.com");
const EXPECTED_PATHNAMES = ["/", "/test"];

function createEvent(url?: URL | string, depth?: number | string): CrawlEvent {
    const event: CrawlEvent = {};
    if (url) {
        event.url = url.toString();
    }

    if (depth) {
        event.depth = depth.toString();
    }

    return event;
}

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe.each([
    ["invalid url (numeric)", "1"],
    ["invalid url", `test ${EXPECTED_VALID_URL}`],
])("handles invalid event with %s", (text: string, eventURL: string) => {
    const event = createEvent(eventURL);
    let response: CrawlResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockValidator.validate.mockReturnValue({ url: eventURL });
        response = await adapter.crawl(event);
    });

    test("calls validator to validate event", () => {
        expect(mockValidator.validate).toHaveBeenCalledTimes(1);
        expect(mockValidator.validate).toHaveBeenCalledWith(event);
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

describe("handles invalid event that does not pass validation", () => {
    const event = createEvent();
    let response: CrawlResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockValidator.validate.mockImplementation(() => {
            throw new Error();
        });
        response = await adapter.crawl(event);
    });

    test("calls validator with provided event", () => {
        expect(mockValidator.validate).toHaveBeenCalledTimes(1);
        expect(mockValidator.validate).toHaveBeenCalledWith(event);
    });

    test("does not call crawl port", async () => {
        expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(0);
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
    ["no depth provided", EXPECTED_VALID_URL],
    ["a max depth provided", EXPECTED_VALID_URL, 10],
])(
    "handles a single valid URL with %s",
    (message: string, expectedURL: URL, expectedDepth?: number) => {
        const event = createEvent(expectedURL, expectedDepth);
        let response: CrawlResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            mockValidator.validate.mockReturnValue({
                url: expectedURL.toString(),
                depth: expectedDepth,
            });
            mockCrawlPort.crawl.mockResolvedValue({
                success: true,
                pathnames: EXPECTED_PATHNAMES,
            });

            response = await adapter.crawl(event);
        });

        test("calls object validator with provided event", () => {
            expect(mockValidator.validate).toHaveBeenCalledTimes(1);
            expect(mockValidator.validate).toHaveBeenCalledWith(event);
        });

        test("calls crawl port with URL and depth from event", () => {
            expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(1);
            expect(mockCrawlPort.crawl).toHaveBeenCalledWith(
                expectedURL,
                expectedDepth
            );
        });

        test("returns base URL in response given crawl succeeds", () => {
            expect(response).toBeDefined();
            expect(response.baseURL).toEqual(EXPECTED_VALID_URL.hostname);
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
    const event = createEvent(EXPECTED_VALID_URL);

    beforeEach(() => {
        jest.resetAllMocks();

        mockValidator.validate.mockReturnValue({
            url: EXPECTED_VALID_URL.toString(),
        });
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
