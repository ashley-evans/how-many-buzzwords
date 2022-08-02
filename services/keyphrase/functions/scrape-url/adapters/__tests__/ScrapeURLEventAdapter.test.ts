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
    ["an invalid base URL", createEvent("i am invalid", VALID_PATHNAME)],
    ["a missing pathname", createEvent(VALID_BASE_URL, undefined)],
    ["an invalid pathname", createEvent(VALID_BASE_URL, "i am invalid")],
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

test("calls domain with provided valid (Base URL includes protocol)", async () => {
    const expectedURL = new URL(`${VALID_BASE_URL}${VALID_PATHNAME}`);
    const event = createEvent(VALID_BASE_URL, VALID_PATHNAME);

    await adapter.handleEvent(event);

    expect(mockPort.scrapeURL).toHaveBeenCalledTimes(1);
    expect(mockPort.scrapeURL).toHaveBeenCalledWith(expectedURL);
});

test("returns success if URL is successfully scraped", async () => {
    mockPort.scrapeURL.mockResolvedValue(true);
    const event = createEvent(VALID_BASE_URL, VALID_PATHNAME);

    const actual = await adapter.handleEvent(event);

    expect(actual.success).toBe(true);
});
