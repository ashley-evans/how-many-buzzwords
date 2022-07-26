import { mock } from "jest-mock-extended";
import { CrawlStatus } from "buzzword-aws-crawl-urls-repository-library";

import { RecentCrawlEventAdapter } from "../RecentCrawlEventAdapter";
import { RecentCrawlEvent } from "../../ports/RecentCrawlAdapter";
import {
    RecentCrawlPort,
    RecentCrawlResponse,
} from "../../ports/RecentCrawlPort";

const VALID_URL = new URL("https://www.example.com/");

const mockPort = mock<RecentCrawlPort>();
const adapter = new RecentCrawlEventAdapter(mockPort);

function createEvent(url: URL | string): RecentCrawlEvent {
    const event: RecentCrawlEvent = {};
    if (url) {
        event.url = url.toString();
    }

    return event;
}

test.each([
    ["invalid url (numeric)", "1"],
    ["invalid url", `test ${VALID_URL.toString()}`],
])("throws exception given %s", async (message: string, eventURL: string) => {
    const event = createEvent(eventURL);

    expect.assertions(1);
    await expect(adapter.hasCrawledRecently(event)).rejects.toEqual(
        expect.objectContaining({
            message: expect.stringContaining(
                "Exception occurred during event validation:"
            ),
        })
    );
});

describe.each([
    [
        "a valid URL (including protocol) that has been crawled recently",
        true,
        VALID_URL,
        VALID_URL.hostname,
    ],
    [
        "a valid URL (including protocol) that has not been crawled recently",
        false,
        VALID_URL,
        VALID_URL.hostname,
    ],
    [
        "a valid URL (excluding protocol) that has been crawled recently",
        true,
        VALID_URL.hostname,
        VALID_URL.hostname,
    ],
    [
        "a valid URL (excluding protocol) that has not been crawled recently",
        false,
        VALID_URL.hostname,
        VALID_URL.hostname,
    ],
])(
    "given an event with a valid URL %s",
    (
        message: string,
        recentlyCrawled: boolean,
        inputURL: URL | string,
        expectedURLOutput: string
    ) => {
        const event = createEvent(inputURL);
        const successResponse: RecentCrawlResponse = {
            recentlyCrawled,
            status: CrawlStatus.COMPLETE,
            crawlTime: new Date(),
        };

        beforeEach(() => {
            mockPort.hasCrawledRecently.mockReset();
            mockPort.hasCrawledRecently.mockResolvedValue(successResponse);
        });

        test("calls domain with provided URL", async () => {
            await adapter.hasCrawledRecently(event);

            expect(mockPort.hasCrawledRecently).toHaveBeenCalledTimes(1);
            expect(mockPort.hasCrawledRecently).toHaveBeenCalledWith(VALID_URL);
        });

        test("returns provided URL's hostname in response", async () => {
            const response = await adapter.hasCrawledRecently(event);

            expect(response.baseURL).toEqual(expectedURLOutput);
        });

        test("returns whether recently crawled in response", async () => {
            const response = await adapter.hasCrawledRecently(event);

            expect(response.recentlyCrawled).toEqual(recentlyCrawled);
        });

        test("returns crawl status in response", async () => {
            const response = await adapter.hasCrawledRecently(event);

            expect(response.status).toEqual(CrawlStatus.COMPLETE);
        });

        test("returns crawl date time in response", async () => {
            const response = await adapter.hasCrawledRecently(event);

            expect(response.crawlTime).toEqual(successResponse.crawlTime);
        });
    }
);

describe.each([
    ["(including protocol)", VALID_URL, VALID_URL.hostname],
    ["(excluding protocol)", VALID_URL.hostname, VALID_URL.hostname],
])(
    "given an event with a valid URL %s that has never been crawled",
    (message: string, inputURL: URL | string, expectedURLOutput: string) => {
        const event = createEvent(inputURL);

        beforeEach(async () => {
            mockPort.hasCrawledRecently.mockReset();
            mockPort.hasCrawledRecently.mockResolvedValue(undefined);
        });

        test("calls domain with valid URL", async () => {
            await adapter.hasCrawledRecently(event);

            expect(mockPort.hasCrawledRecently).toHaveBeenCalledTimes(1);
            expect(mockPort.hasCrawledRecently).toHaveBeenCalledWith(VALID_URL);
        });

        test("returns provided URL's hostname in response", async () => {
            const response = await adapter.hasCrawledRecently(event);

            expect(response.baseURL).toEqual(expectedURLOutput);
        });

        test("returns not recently crawled in response", async () => {
            const response = await adapter.hasCrawledRecently(event);

            expect(response.recentlyCrawled).toEqual(false);
        });

        test("returns no status in response", async () => {
            const response = await adapter.hasCrawledRecently(event);

            expect(response.status).toBeUndefined();
        });

        test("returns no crawl datetime in response", async () => {
            const response = await adapter.hasCrawledRecently(event);

            expect(response.crawlTime).toBeUndefined();
        });
    }
);
