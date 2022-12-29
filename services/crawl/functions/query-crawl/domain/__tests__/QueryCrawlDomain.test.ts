import { mock } from "jest-mock-extended";

import CrawlRepositoryPort from "../../ports/CrawlRepositoryPort";
import Crawl from "../../types/Crawl";
import QueryCrawlDomain from "../QueryCrawlDomain";

const mockRepository = mock<CrawlRepositoryPort>();

const DEFAULT_LIMIT = 5;

const domain = new QueryCrawlDomain(mockRepository, DEFAULT_LIMIT);

beforeEach(() => {
    mockRepository.queryCrawl.mockReset();
});

test("calls repository to get latest crawls with provided limit", async () => {
    const expectedLimit = 10;

    await domain.queryCrawl(expectedLimit);

    expect(mockRepository.queryCrawl).toHaveBeenCalledTimes(1);
    expect(mockRepository.queryCrawl).toHaveBeenCalledWith(expectedLimit);
});

test("defaults to the default configured limit if no limit provided", async () => {
    await domain.queryCrawl(undefined);

    expect(mockRepository.queryCrawl).toHaveBeenCalledTimes(1);
    expect(mockRepository.queryCrawl).toHaveBeenCalledWith(DEFAULT_LIMIT);
});

test.each([
    ["an empty array if no crawls", []],
    [
        "all recent crawls if recent crawls",
        [
            {
                baseURL: new URL("https://www.test.com/"),
                crawledAt: new Date(),
            },
            {
                baseURL: new URL("https://www.wibble.com/"),
                crawledAt: new Date(),
            },
        ],
    ],
])(
    "returns %s are returned from the port",
    async (message: string, expected: Crawl[]) => {
        mockRepository.queryCrawl.mockResolvedValue(expected);

        const actual = await domain.queryCrawl();

        expect(actual).toEqual(expected);
    }
);

test.each([
    ["limit of zero", 0],
    ["negative limit is provided", -1],
])(
    "throws an error if a %s is provided",
    async (message: string, limit: number) => {
        const expectedError =
            "Invalid limit provided. Must be greater than zero";

        expect.assertions(1);
        await expect(() => domain.queryCrawl(limit)).rejects.toThrow(
            expectedError
        );
    }
);

test("throws an error if an unhandled error is thrown by the port", async () => {
    const expectedError = new Error("Test Error");
    mockRepository.queryCrawl.mockRejectedValue(expectedError);

    expect.assertions(1);
    await expect(() => domain.queryCrawl()).rejects.toThrow(expectedError);
});
