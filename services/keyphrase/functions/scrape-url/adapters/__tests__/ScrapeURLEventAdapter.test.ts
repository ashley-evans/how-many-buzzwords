import { mock } from "jest-mock-extended";

import ScrapeURLPort from "../../ports/ScrapeURLPort";
import { ScrapeURLEvent } from "../../ports/ScrapeURLPrimaryAdapter";
import ScrapeURLEventAdapter from "../ScrapeURLEventAdapter";

const VALID_BASE_URL = "https://www.example.com";
const VALID_PATHNAME = "/test";

const mockPort = mock<ScrapeURLPort>();

const adapter = new ScrapeURLEventAdapter(mockPort);

function createEvent(baseURL?: string, pathname?: string) {
    return {
        baseURL,
        pathname,
    };
}

beforeEach(() => {
    mockPort.scrapeURL.mockReset();
});

test.each([
    ["a missing base URL", createEvent(undefined, VALID_PATHNAME)],
    [
        "an invalid base URL (spaces)",
        createEvent("i am invalid", VALID_PATHNAME),
    ],
    ["an invalid base URL (numeric)", createEvent("1", VALID_PATHNAME)],
    ["a missing pathname", createEvent(VALID_BASE_URL, undefined)],
    [
        "an invalid pathname (missing leading forward slash)",
        createEvent(VALID_BASE_URL, "no forward"),
    ],
])(
    "throws an exception given an invalid event with %s",
    async (message: string, event: ScrapeURLEvent) => {
        expect.assertions(1);
        await expect(adapter.handleEvent(event)).rejects.toEqual(
            expect.objectContaining({
                message: expect.stringContaining(
                    "Exception occurred during event validation:"
                ),
            })
        );
    }
);

test.each([
    [
        "includes protocol",
        VALID_BASE_URL,
        new URL(`${VALID_BASE_URL}${VALID_PATHNAME}`),
    ],
    [
        "excludes protocol",
        "www.example.com",
        new URL(`https://www.example.com${VALID_PATHNAME}`),
    ],
])(
    "calls domain with provided valid (base URL %s)",
    async (message: string, baseURL: string, expectedURL: URL) => {
        mockPort.scrapeURL.mockResolvedValue(true);
        const event = createEvent(baseURL, VALID_PATHNAME);

        await adapter.handleEvent(event);

        expect(mockPort.scrapeURL).toHaveBeenCalledTimes(1);
        expect(mockPort.scrapeURL).toHaveBeenCalledWith(expectedURL);
    }
);

test("returns success if URL is successfully scraped", async () => {
    mockPort.scrapeURL.mockResolvedValue(true);
    const event = createEvent(VALID_BASE_URL, VALID_PATHNAME);

    const actual = await adapter.handleEvent(event);

    expect(actual.success).toBe(true);
});

test("throws an error if the URL could not be scraped", async () => {
    mockPort.scrapeURL.mockResolvedValue(false);
    const event = createEvent(VALID_BASE_URL, VALID_PATHNAME);

    expect.assertions(1);
    await expect(adapter.handleEvent(event)).rejects.toEqual(
        expect.objectContaining({
            message: "URL scrape failed.",
        })
    );
});

test("throws exception if an unhandled exception is thrown scraping the URL", async () => {
    const expectedError = new Error("test error");
    mockPort.scrapeURL.mockRejectedValue(expectedError);
    const event = createEvent(VALID_BASE_URL, VALID_PATHNAME);

    expect.assertions(1);
    await expect(adapter.handleEvent(event)).rejects.toEqual(expectedError);
});
