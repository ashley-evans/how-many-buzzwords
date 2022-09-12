import { CrawlStatus } from "buzzword-crawl-urls-repository-library";
import { mock } from "jest-mock-extended";

import UpdateStatusPort from "../../ports/UpdateStatusPort";
import { UpdateStatusEvent } from "../../ports/UpdateStatusPrimaryAdapter";
import UpdateStatusEventAdapter from "../UpdateStatusEventAdapter";

function createEvent(url?: URL | string, status?: string): UpdateStatusEvent {
    return {
        url: url ? url.toString() : undefined,
        status,
    };
}

const mockPort = mock<UpdateStatusPort>();

const adapter = new UpdateStatusEventAdapter(mockPort);

const VALID_URL = new URL("https://www.example.com/");
const VALID_EVENT = createEvent(VALID_URL, CrawlStatus.COMPLETE);

beforeEach(() => {
    mockPort.updateCrawlStatus.mockReset();
});

test.each([
    ["missing URL", createEvent(undefined, CrawlStatus.COMPLETE)],
    ["invalid URL (numeric)", createEvent("1", CrawlStatus.COMPLETE)],
    [
        "invalid URL (format)",
        createEvent("test https://www.example.com", CrawlStatus.COMPLETE),
    ],
    ["missing status", createEvent(VALID_URL)],
    ["invalid status", createEvent(VALID_URL, "not a valid status")],
])(
    "throws exception given %s",
    async (message: string, event: UpdateStatusEvent) => {
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
    ["a protocol", VALID_URL, VALID_URL],
    ["no protocol", VALID_URL.hostname, VALID_URL],
])(
    "calls domain with provided URL and status given valid event with a URL that has %s",
    async (message: string, url: URL | string, expectedURL: URL) => {
        const event = createEvent(url, CrawlStatus.COMPLETE);

        await adapter.handleEvent(event);

        expect(mockPort.updateCrawlStatus).toHaveBeenCalledTimes(1);
        expect(mockPort.updateCrawlStatus).toHaveBeenCalledWith(
            expectedURL,
            CrawlStatus.COMPLETE
        );
    }
);

test("returns success given status update was successful", async () => {
    mockPort.updateCrawlStatus.mockResolvedValue(true);

    const actual = await adapter.handleEvent(VALID_EVENT);

    expect(actual.success).toEqual(true);
});

test("throws error if an unhandled error occurs during status update", async () => {
    const expectedErrorMessage = "Test Error";
    mockPort.updateCrawlStatus.mockRejectedValue(
        new Error(expectedErrorMessage)
    );

    expect.assertions(1);
    await expect(adapter.handleEvent(VALID_EVENT)).rejects.toEqual(
        expect.objectContaining({
            message: expect.stringContaining(expectedErrorMessage),
        })
    );
});

test("returns failure if the status fails to update", async () => {
    mockPort.updateCrawlStatus.mockResolvedValue(false);

    const actual = await adapter.handleEvent(VALID_EVENT);

    expect(actual.success).toEqual(false);
});
