import { AppSyncResolverEvent } from "aws-lambda";
import { mock } from "jest-mock-extended";

import { QueryCrawlsArgs } from "../../../../schemas/schema";
import QueryCrawlPort from "../../ports/QueryCrawlPort";
import Crawl from "../../types/Crawl";
import QueryCrawlAdapter from "../QueryCrawlAdapter";

const VALID_URLS = [
    new URL("https://www.test.com/"),
    new URL("https://www.example.com/"),
];

const mockPort = mock<QueryCrawlPort>();
const adapter = new QueryCrawlAdapter(mockPort);

function createEvent(limit?: number): AppSyncResolverEvent<QueryCrawlsArgs> {
    const event = mock<AppSyncResolverEvent<QueryCrawlsArgs>>();
    event.arguments = {
        limit,
    };

    return event;
}

beforeEach(() => {
    mockPort.queryCrawl.mockClear();
    mockPort.queryCrawl.mockResolvedValue([]);
});

test.each([
    ["with no limit if no limit is provided", undefined],
    ["with a limit if provided", 3],
])(
    "calls port with no limit if no limit is provided",
    async (message: string, limit?: number) => {
        const event = createEvent(limit);

        await adapter.handleQuery(event);

        expect(mockPort.queryCrawl).toHaveBeenCalledTimes(1);
        expect(mockPort.queryCrawl).toHaveBeenCalledWith(limit);
    }
);

test("returns no crawl details if nonereturned from port", async () => {
    const event = createEvent();

    const actual = await adapter.handleQuery(event);

    expect(actual).toEqual([]);
});

test("returns multiple crawl details if multiple returned from port", async () => {
    const returnedDetails: Crawl[] = VALID_URLS.map((url) => ({
        baseURL: url,
        crawledAt: new Date(),
    }));
    const event = createEvent();
    mockPort.queryCrawl.mockResolvedValue(returnedDetails);

    const actual = await adapter.handleQuery(event);

    expect(actual).toHaveLength(returnedDetails.length);
    for (const returned of returnedDetails) {
        expect(actual).toContainEqual({
            id: returned.baseURL.toString(),
            crawledAt: returned.crawledAt.toISOString(),
        });
    }
});

test("throws an error if an unhandled exception occurs while getting fetching crawl details", async () => {
    const event = createEvent();
    const expectedError = new Error("Test Error");
    mockPort.queryCrawl.mockRejectedValue(expectedError);

    expect.assertions(1);
    await expect(() => adapter.handleQuery(event)).rejects.toThrow(
        expectedError
    );
});
