import { mock } from "jest-mock-extended";
import { when } from "jest-when";
import { EMPTY, of, throwError, concat, Observable } from "rxjs";
import {
    CrawlStatus,
    Repository,
} from "buzzword-crawl-urls-repository-library";
import { ContentRepository } from "buzzword-crawl-content-repository-library";

import { CrawlProvider, CrawlResult } from "../../ports/CrawlProvider";
import Crawl from "../Crawl";

const mockCrawlProvider = mock<CrawlProvider>();
const mockURLRepository = mock<Repository>();
const mockContentRepository = mock<ContentRepository>();
const crawler = new Crawl(
    mockCrawlProvider,
    mockURLRepository,
    mockContentRepository
);

const EXPECTED_DOMAIN = "example.com";
const DEFAULT_BASE_URL = new URL(`http://www.${EXPECTED_DOMAIN}/`);
const EXPECTED_PATHNAME = "example";
const DEFAULT_CHILD_URL = new URL(
    `${DEFAULT_BASE_URL.toString()}${EXPECTED_PATHNAME}`
);
const EXPECTED_CONTENT = "test";

function createCrawlerResult(url: URL, content?: string): CrawlResult {
    return {
        url,
        content: content ? content : "",
    };
}

beforeEach(() => {
    mockCrawlProvider.crawl.mockReset();
    mockURLRepository.storePathname.mockReset();
    mockURLRepository.updateCrawlStatus.mockReset();
    mockContentRepository.storePageContent.mockReset();
});

describe("crawl provides results", () => {
    describe.each([
        [
            "http (including subdomain)",
            new URL(`http://www.${EXPECTED_DOMAIN}/`),
            new URL(`http://${EXPECTED_DOMAIN}/`),
        ],
        [
            "https (including subdomain)",
            new URL(`https://www.${EXPECTED_DOMAIN}/`),
            new URL(`https://${EXPECTED_DOMAIN}/`),
        ],
        [
            "http (excluding subdomain)",
            new URL(`http://${EXPECTED_DOMAIN}/`),
            new URL(`http://${EXPECTED_DOMAIN}/`),
        ],
        [
            "https (excluding subdomain)",
            new URL(`https://${EXPECTED_DOMAIN}/`),
            new URL(`https://${EXPECTED_DOMAIN}/`),
        ],
    ])("handles %s URLs", (message: string, url: URL, expectedURL: URL) => {
        beforeEach(() => {
            const source = of(createCrawlerResult(url, EXPECTED_CONTENT));
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockURLRepository.storePathname.mockResolvedValue(true);
            mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
            mockContentRepository.storePageContent.mockResolvedValue(true);
        });

        test("calls crawl provider with provided URL", async () => {
            await crawler.crawl(url);

            expect(mockCrawlProvider.crawl).toHaveBeenCalledWith(
                url,
                undefined
            );
        });

        test("updates the crawl status related to the provided base URL's domain to started and complete", async () => {
            await crawler.crawl(url);

            expect(mockURLRepository.updateCrawlStatus).toHaveBeenCalledTimes(
                2
            );
            expect(mockURLRepository.updateCrawlStatus).toHaveBeenNthCalledWith(
                1,
                EXPECTED_DOMAIN,
                CrawlStatus.STARTED
            );
            expect(mockURLRepository.updateCrawlStatus).toHaveBeenNthCalledWith(
                2,
                EXPECTED_DOMAIN,
                CrawlStatus.COMPLETE
            );
        });

        test("stores the crawled paths in the URL repository against the provided URL's domain", async () => {
            await crawler.crawl(url);

            expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(1);
            expect(mockURLRepository.storePathname).toHaveBeenCalledWith(
                EXPECTED_DOMAIN,
                expectedURL.pathname
            );
        });

        test("stores the crawled content in the content repository against ", async () => {
            await crawler.crawl(url);

            expect(
                mockContentRepository.storePageContent
            ).toHaveBeenCalledTimes(1);
            expect(mockContentRepository.storePageContent).toHaveBeenCalledWith(
                expectedURL,
                EXPECTED_CONTENT
            );
        });

        test("returns success if storage succeeds", async () => {
            const response = await crawler.crawl(url);

            expect(response.success).toBe(true);
        });

        test("returns child url pathname if storage succeeds", async () => {
            const response = await crawler.crawl(url);

            expect(response.pathnames).toHaveLength(1);
            expect(response.pathnames).toContainEqual(expectedURL.pathname);
        });
    });

    test("stores multiple paths in URLs repository if multiple paths crawled", async () => {
        const source = of(
            createCrawlerResult(DEFAULT_BASE_URL),
            createCrawlerResult(DEFAULT_CHILD_URL)
        );
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockURLRepository.storePathname.mockResolvedValue(true);
        mockURLRepository.updateCrawlStatus.mockResolvedValue(true);

        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(2);
        expect(mockURLRepository.storePathname).toHaveBeenCalledWith(
            EXPECTED_DOMAIN,
            DEFAULT_BASE_URL.pathname
        );
        expect(mockURLRepository.storePathname).toHaveBeenCalledWith(
            EXPECTED_DOMAIN,
            DEFAULT_CHILD_URL.pathname
        );
    });
});

describe("crawl returns no results", () => {
    beforeEach(() => {
        const source = EMPTY;
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
    });

    test("does not store any crawled paths in the URL repository", async () => {
        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockURLRepository.storePathname).not.toBeCalled();
    });

    test("does not store any content", async () => {
        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockContentRepository.storePageContent).not.toBeCalled();
    });

    test("updates the crawl status to started but not complete", async () => {
        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
        expect(mockURLRepository.updateCrawlStatus).toHaveBeenCalledWith(
            EXPECTED_DOMAIN,
            CrawlStatus.STARTED
        );
    });

    test("returns failure", async () => {
        const response = await crawler.crawl(DEFAULT_BASE_URL);

        expect(response.success).toBe(false);
    });

    test("returns no pathnames", async () => {
        const response = await crawler.crawl(DEFAULT_BASE_URL);

        expect(response.pathnames).toHaveLength(0);
    });
});

describe("optional max depth parameter", () => {
    test("provides optional max crawl depth to crawl provider if provided", async () => {
        const expectedMaxCrawlDepth = 50;

        const source = EMPTY;
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockURLRepository.storePathname.mockResolvedValue(true);
        mockURLRepository.updateCrawlStatus.mockResolvedValue(true);

        await crawler.crawl(DEFAULT_BASE_URL, expectedMaxCrawlDepth);

        expect(mockCrawlProvider.crawl).toHaveBeenCalledWith(
            DEFAULT_BASE_URL,
            expectedMaxCrawlDepth
        );
    });
});

describe("Error handling", () => {
    beforeAll(() => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    describe.each([
        ["starting crawl", throwError(() => new Error())],
        [
            "successful crawl",
            concat(
                of(createCrawlerResult(DEFAULT_CHILD_URL)),
                throwError(() => new Error())
            ),
            [DEFAULT_CHILD_URL.pathname],
        ],
    ])(
        "given error occurs after %s",
        (
            message: string,
            crawlResults: Observable<CrawlResult>,
            expectedPathnames: string[] = []
        ) => {
            beforeEach(() => {
                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.storePathname.mockResolvedValue(true);
                mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
                mockContentRepository.storePageContent.mockResolvedValue(true);
            });

            test("stores each path successfully crawled in the URLs repository", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(
                    expectedPathnames.length
                );
            });

            test("stores the content of each path successfully crawled in the content repository", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(
                    mockContentRepository.storePageContent
                ).toHaveBeenCalledTimes(expectedPathnames.length);
            });

            test("updates the crawl status to started but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(EXPECTED_DOMAIN, CrawlStatus.STARTED);
            });

            test("returns failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.pathnames).toHaveLength(
                    expectedPathnames.length
                );
                expect(response.pathnames).toEqual(
                    expect.arrayContaining(expectedPathnames)
                );
            });
        }
    );

    describe.each([
        ["first crawl", of(createCrawlerResult(DEFAULT_CHILD_URL)), [false]],
        [
            "subsequent crawls",
            of(
                createCrawlerResult(DEFAULT_BASE_URL),
                createCrawlerResult(DEFAULT_CHILD_URL)
            ),
            [true, false],
            [DEFAULT_BASE_URL.pathname],
        ],
    ])(
        "given pathname storage returns failure after %s",
        (
            message: string,
            crawlResults: Observable<CrawlResult>,
            failureSequence: boolean[],
            expectedPathnames: string[] = []
        ) => {
            beforeEach(() => {
                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
                for (const result of failureSequence) {
                    mockURLRepository.storePathname.mockResolvedValueOnce(
                        result
                    );
                }
                mockContentRepository.storePageContent.mockResolvedValue(true);
            });

            test("only stores content related to paths successfully added to the URLs repository", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockContentRepository.storePageContent).toBeCalledTimes(
                    expectedPathnames.length
                );
            });

            test("updates the crawl status to started but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(EXPECTED_DOMAIN, CrawlStatus.STARTED);
            });

            test("returns failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.pathnames).toHaveLength(
                    expectedPathnames.length
                );
                expect(response.pathnames).toEqual(
                    expect.arrayContaining(expectedPathnames)
                );
            });
        }
    );

    describe.each([
        ["first crawl", of(createCrawlerResult(DEFAULT_CHILD_URL)), [false]],
        [
            "subsequent crawls",
            of(
                createCrawlerResult(DEFAULT_BASE_URL),
                createCrawlerResult(DEFAULT_CHILD_URL)
            ),
            [true, false],
            [DEFAULT_BASE_URL.pathname],
        ],
    ])(
        "given content storage returns failure after %s",
        (
            message: string,
            crawlResults: Observable<CrawlResult>,
            failureSequence: boolean[],
            expectedPathnames: string[] = []
        ) => {
            beforeEach(() => {
                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.storePathname.mockResolvedValue(true);
                mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
                for (const result of failureSequence) {
                    mockContentRepository.storePageContent.mockResolvedValueOnce(
                        result
                    );
                }
            });

            test("updates the crawl status to started but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(EXPECTED_DOMAIN, CrawlStatus.STARTED);
            });

            test("returns failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.pathnames).toHaveLength(
                    expectedPathnames.length
                );
                expect(response.pathnames).toEqual(
                    expect.arrayContaining(expectedPathnames)
                );
            });
        }
    );

    describe.each([
        [
            "first crawl",
            of(createCrawlerResult(DEFAULT_CHILD_URL)),
            [new Error()],
        ],
        [
            "subsequent crawls",
            of(
                createCrawlerResult(DEFAULT_BASE_URL),
                createCrawlerResult(DEFAULT_CHILD_URL)
            ),
            [undefined, new Error()],
            [DEFAULT_BASE_URL.pathname],
        ],
    ])(
        "given error occurs during pathname storage after %s",
        (
            message: string,
            crawlResults: Observable<CrawlResult>,
            failureSequence: (Error | undefined)[],
            expectedPathnames: string[] = []
        ) => {
            beforeEach(() => {
                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
                for (const error of failureSequence) {
                    if (error) {
                        mockURLRepository.storePathname.mockRejectedValueOnce(
                            error
                        );
                    } else {
                        mockURLRepository.storePathname.mockResolvedValueOnce(
                            true
                        );
                    }
                }
                mockContentRepository.storePageContent.mockResolvedValue(true);
            });

            test("only stores content related to paths successfully added to the URLs repository", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockContentRepository.storePageContent).toBeCalledTimes(
                    expectedPathnames.length
                );
            });

            test("updates the crawl status to started but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(EXPECTED_DOMAIN, CrawlStatus.STARTED);
            });

            test("returns failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.pathnames).toHaveLength(
                    expectedPathnames.length
                );
                expect(response.pathnames).toEqual(
                    expect.arrayContaining(expectedPathnames)
                );
            });
        }
    );

    describe.each([
        [
            "first crawl",
            of(createCrawlerResult(DEFAULT_CHILD_URL)),
            [new Error()],
        ],
        [
            "subsequent crawls",
            of(
                createCrawlerResult(DEFAULT_BASE_URL),
                createCrawlerResult(DEFAULT_CHILD_URL)
            ),
            [undefined, new Error()],
            [DEFAULT_BASE_URL.pathname],
        ],
    ])(
        "given error occurs during content storage after %s",
        (
            message: string,
            crawlResults: Observable<CrawlResult>,
            failureSequence: (Error | undefined)[],
            expectedPathnames: string[] = []
        ) => {
            beforeEach(() => {
                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.storePathname.mockResolvedValue(true);
                mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
                for (const error of failureSequence) {
                    if (error) {
                        mockContentRepository.storePageContent.mockRejectedValueOnce(
                            error
                        );
                    } else {
                        mockContentRepository.storePageContent.mockResolvedValueOnce(
                            true
                        );
                    }
                }
            });

            test("updates the crawl status to started but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(EXPECTED_DOMAIN, CrawlStatus.STARTED);
            });

            test("returns failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", async () => {
                const response = await crawler.crawl(DEFAULT_BASE_URL);

                expect(response.pathnames).toHaveLength(
                    expectedPathnames.length
                );
                expect(response.pathnames).toEqual(
                    expect.arrayContaining(expectedPathnames)
                );
            });
        }
    );

    describe("given an unexpected error occurs storing the crawl started status", () => {
        beforeEach(() => {
            mockURLRepository.updateCrawlStatus.mockRejectedValue(new Error());
        });

        test("does not initiate crawl", async () => {
            await crawler.crawl(DEFAULT_BASE_URL);

            expect(mockCrawlProvider.crawl).not.toHaveBeenCalled();
        });

        test("returns failure", async () => {
            const response = await crawler.crawl(DEFAULT_BASE_URL);

            expect(response.success).toBe(false);
        });

        test("returns no pathnames", async () => {
            const response = await crawler.crawl(DEFAULT_BASE_URL);

            expect(response.pathnames).toBeUndefined();
        });
    });

    describe("given the start status update failed to save", () => {
        beforeEach(() => {
            mockURLRepository.updateCrawlStatus.mockResolvedValue(false);
        });

        test("does not initiate crawl", async () => {
            await crawler.crawl(DEFAULT_BASE_URL);

            expect(mockCrawlProvider.crawl).not.toHaveBeenCalled();
        });

        test("returns failure", async () => {
            const response = await crawler.crawl(DEFAULT_BASE_URL);

            expect(response.success).toBe(false);
        });

        test("returns no pathnames", async () => {
            const response = await crawler.crawl(DEFAULT_BASE_URL);

            expect(response.pathnames).toBeUndefined();
        });
    });

    describe("given an unexpected error occurs setting the crawl status to completed when crawl was successful", () => {
        beforeEach(() => {
            mockCrawlProvider.crawl.mockReturnValue(
                of(createCrawlerResult(DEFAULT_BASE_URL))
            );
            mockURLRepository.storePathname.mockResolvedValue(true);
            mockContentRepository.storePageContent.mockResolvedValue(true);
            when(mockURLRepository.updateCrawlStatus)
                .calledWith(EXPECTED_DOMAIN, CrawlStatus.STARTED)
                .mockResolvedValue(true);
            when(mockURLRepository.updateCrawlStatus)
                .calledWith(EXPECTED_DOMAIN, CrawlStatus.COMPLETE)
                .mockRejectedValue(new Error());
        });

        test("returns failure", async () => {
            const result = await crawler.crawl(DEFAULT_BASE_URL);

            expect(result.success).toBe(false);
        });

        test("returns paths crawled", async () => {
            const result = await crawler.crawl(DEFAULT_BASE_URL);

            expect(result.pathnames).toHaveLength(1);
            expect(result.pathnames).toEqual(
                expect.arrayContaining([DEFAULT_BASE_URL.pathname])
            );
        });
    });

    describe("given the complete status update fails to save when crawl was successful", () => {
        beforeEach(() => {
            mockCrawlProvider.crawl.mockReturnValue(
                of(createCrawlerResult(DEFAULT_BASE_URL))
            );
            mockURLRepository.storePathname.mockResolvedValue(true);
            mockContentRepository.storePageContent.mockResolvedValue(true);
            when(mockURLRepository.updateCrawlStatus)
                .calledWith(EXPECTED_DOMAIN, CrawlStatus.STARTED)
                .mockResolvedValue(true);
            when(mockURLRepository.updateCrawlStatus)
                .calledWith(EXPECTED_DOMAIN, CrawlStatus.COMPLETE)
                .mockResolvedValue(false);
        });

        test("returns failure", async () => {
            const result = await crawler.crawl(DEFAULT_BASE_URL);

            expect(result.success).toBe(false);
        });

        test("returns paths crawled", async () => {
            const result = await crawler.crawl(DEFAULT_BASE_URL);

            expect(result.pathnames).toHaveLength(1);
            expect(result.pathnames).toEqual(
                expect.arrayContaining([DEFAULT_BASE_URL.pathname])
            );
        });
    });
});
