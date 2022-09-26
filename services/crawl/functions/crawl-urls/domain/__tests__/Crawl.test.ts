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

const EXPECTED_BASE_URL_HOSTNAME = "www.example.com";
const DEFAULT_BASE_URL = new URL(`http://www.example.com`);
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

describe("crawl provides results", () => {
    describe.each(["http", "https"])("handles %s URLs", (protocol) => {
        const baseURL = new URL(`${protocol}://${EXPECTED_BASE_URL_HOSTNAME}`);
        const childURL = new URL(`${baseURL.toString()}${EXPECTED_PATHNAME}`);

        beforeEach(() => {
            const source = of(createCrawlerResult(childURL, EXPECTED_CONTENT));
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockURLRepository.storePathname.mockResolvedValue(true);
            mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
            mockContentRepository.storePageContent.mockResolvedValue(true);
        });

        test("calls crawl provider with URL", async () => {
            await crawler.crawl(baseURL);

            expect(mockCrawlProvider.crawl).toHaveBeenCalledWith(
                baseURL,
                undefined
            );
        });

        test("updates the crawl status related to the provided base URL to started and complete", async () => {
            await crawler.crawl(baseURL);

            expect(mockURLRepository.updateCrawlStatus).toHaveBeenCalledTimes(
                2
            );
            expect(mockURLRepository.updateCrawlStatus).toHaveBeenNthCalledWith(
                1,
                EXPECTED_BASE_URL_HOSTNAME,
                CrawlStatus.STARTED
            );
            expect(mockURLRepository.updateCrawlStatus).toHaveBeenNthCalledWith(
                2,
                EXPECTED_BASE_URL_HOSTNAME,
                CrawlStatus.COMPLETE
            );
        });

        test("provides child pathname and url to repository without protocol", async () => {
            await crawler.crawl(baseURL);

            expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(1);
            expect(mockURLRepository.storePathname).toHaveBeenCalledWith(
                EXPECTED_BASE_URL_HOSTNAME,
                `/${EXPECTED_PATHNAME}`
            );
        });

        test("provides content repository with crawled url and content", async () => {
            await crawler.crawl(baseURL);

            expect(
                mockContentRepository.storePageContent
            ).toHaveBeenCalledTimes(1);
            expect(mockContentRepository.storePageContent).toHaveBeenCalledWith(
                childURL,
                EXPECTED_CONTENT
            );
        });

        test("returns success if storage succeeds", async () => {
            const response = await crawler.crawl(baseURL);

            expect(response.success).toBe(true);
        });

        test("returns child url pathname if storage succeeds", async () => {
            const response = await crawler.crawl(baseURL);

            expect(response.pathnames).toHaveLength(1);
            expect(response.pathnames).toContainEqual(
                DEFAULT_CHILD_URL.pathname
            );
        });
    });

    test("provides multiple urls to repository given multiple results", async () => {
        jest.resetAllMocks();
        const childURL2 = new URL(`${DEFAULT_BASE_URL.toString()}example2`);

        const source = of(
            createCrawlerResult(DEFAULT_CHILD_URL),
            createCrawlerResult(childURL2)
        );
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockURLRepository.storePathname.mockResolvedValue(true);
        mockURLRepository.updateCrawlStatus.mockResolvedValue(true);

        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(2);
    });
});

describe("crawl returns no results", () => {
    beforeEach(() => {
        jest.resetAllMocks();

        const source = EMPTY;
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
    });

    test("does not store any crawled urls in the url repository", async () => {
        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockURLRepository.storePathname).not.toBeCalled();
    });

    test("does not call content repository", async () => {
        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockContentRepository.storePageContent).not.toBeCalled();
    });

    test("updates the crawl status to running but not complete", async () => {
        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
        expect(mockURLRepository.updateCrawlStatus).toHaveBeenCalledWith(
            EXPECTED_BASE_URL_HOSTNAME,
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
    beforeAll(() => {
        jest.resetAllMocks();
    });

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
        jest.spyOn(console, "error").mockImplementation(() => {
            return undefined;
        });
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
                jest.resetAllMocks();

                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.storePathname.mockResolvedValue(true);
                mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
                mockContentRepository.storePageContent.mockResolvedValue(true);
            });

            test("calls the url repository for each success", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(
                    expectedPathnames.length
                );
            });

            test("calls the content repository for each success", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(
                    mockContentRepository.storePageContent
                ).toHaveBeenCalledTimes(expectedPathnames.length);
            });

            test("updates the crawl status to running but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(
                    EXPECTED_BASE_URL_HOSTNAME,
                    CrawlStatus.STARTED
                );
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
                jest.resetAllMocks();

                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
                for (const result of failureSequence) {
                    mockURLRepository.storePathname.mockResolvedValueOnce(
                        result
                    );
                }
                mockContentRepository.storePageContent.mockResolvedValue(true);
            });

            test("only calls content repository after url stored successfully", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockContentRepository.storePageContent).toBeCalledTimes(
                    expectedPathnames.length
                );
            });

            test("updates the crawl status to running but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(
                    EXPECTED_BASE_URL_HOSTNAME,
                    CrawlStatus.STARTED
                );
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
                jest.resetAllMocks();

                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.storePathname.mockResolvedValue(true);
                mockURLRepository.updateCrawlStatus.mockResolvedValue(true);
                for (const result of failureSequence) {
                    mockContentRepository.storePageContent.mockResolvedValueOnce(
                        result
                    );
                }
            });

            test("updates the crawl status to running but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(
                    EXPECTED_BASE_URL_HOSTNAME,
                    CrawlStatus.STARTED
                );
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
                jest.resetAllMocks();

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

            test("only calls content repository after url stored successfully", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockContentRepository.storePageContent).toBeCalledTimes(
                    expectedPathnames.length
                );
            });

            test("updates the crawl status to running but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(
                    EXPECTED_BASE_URL_HOSTNAME,
                    CrawlStatus.STARTED
                );
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
                jest.resetAllMocks();

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

            test("updates the crawl status to running but not complete", async () => {
                await crawler.crawl(DEFAULT_BASE_URL);

                expect(mockURLRepository.updateCrawlStatus).toBeCalledTimes(1);
                expect(
                    mockURLRepository.updateCrawlStatus
                ).toHaveBeenCalledWith(
                    EXPECTED_BASE_URL_HOSTNAME,
                    CrawlStatus.STARTED
                );
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
            mockCrawlProvider.crawl.mockClear();
            mockURLRepository.updateCrawlStatus.mockClear();
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
            mockCrawlProvider.crawl.mockClear();
            mockURLRepository.updateCrawlStatus.mockClear();
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
            mockCrawlProvider.crawl.mockClear();
            mockURLRepository.storePathname.mockClear();
            mockURLRepository.updateCrawlStatus.mockClear();
            mockContentRepository.storePageContent.mockClear();

            mockCrawlProvider.crawl.mockReturnValue(
                of(createCrawlerResult(DEFAULT_BASE_URL))
            );
            mockURLRepository.storePathname.mockResolvedValue(true);
            mockContentRepository.storePageContent.mockResolvedValue(true);
            when(mockURLRepository.updateCrawlStatus)
                .calledWith(DEFAULT_BASE_URL.hostname, CrawlStatus.STARTED)
                .mockResolvedValue(true);
            when(mockURLRepository.updateCrawlStatus)
                .calledWith(DEFAULT_BASE_URL.hostname, CrawlStatus.COMPLETE)
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
            mockCrawlProvider.crawl.mockClear();
            mockURLRepository.storePathname.mockClear();
            mockURLRepository.updateCrawlStatus.mockClear();
            mockContentRepository.storePageContent.mockClear();

            mockCrawlProvider.crawl.mockReturnValue(
                of(createCrawlerResult(DEFAULT_BASE_URL))
            );
            mockURLRepository.storePathname.mockResolvedValue(true);
            mockContentRepository.storePageContent.mockResolvedValue(true);
            when(mockURLRepository.updateCrawlStatus)
                .calledWith(DEFAULT_BASE_URL.hostname, CrawlStatus.STARTED)
                .mockResolvedValue(true);
            when(mockURLRepository.updateCrawlStatus)
                .calledWith(DEFAULT_BASE_URL.hostname, CrawlStatus.COMPLETE)
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
