import { mock } from "jest-mock-extended";
import { EMPTY, of, throwError, concat, Observable } from "rxjs";
import { Repository } from "buzzword-aws-crawl-urls-repository-library";
import { ContentRepository } from "buzzword-aws-crawl-content-repository-library";

import { CrawlerResponse } from "../../ports/CrawlPort";
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
const DEFAULT_BASE_URL = new URL(`http://${EXPECTED_BASE_URL_HOSTNAME}`);
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

        let response: CrawlerResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            const source = of(createCrawlerResult(childURL, EXPECTED_CONTENT));
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockURLRepository.storePathname.mockResolvedValue(true);
            mockContentRepository.storePageContent.mockResolvedValue(true);

            response = await crawler.crawl(baseURL);
        });

        test("calls crawl provider with URL", () => {
            expect(mockCrawlProvider.crawl).toHaveBeenCalledWith(
                baseURL,
                undefined
            );
        });

        test("provides child pathname and url to repository without protocol", () => {
            expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(1);
            expect(mockURLRepository.storePathname).toHaveBeenCalledWith(
                EXPECTED_BASE_URL_HOSTNAME,
                `/${EXPECTED_PATHNAME}`
            );
        });

        test("provides content repository with crawled url and content", () => {
            expect(
                mockContentRepository.storePageContent
            ).toHaveBeenCalledTimes(1);
            expect(mockContentRepository.storePageContent).toHaveBeenCalledWith(
                childURL,
                EXPECTED_CONTENT
            );
        });

        test("returns success if storage succeeds", () => {
            expect(response.success).toBe(true);
        });

        test("returns child url pathname if storage succeeds", () => {
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

        await crawler.crawl(DEFAULT_BASE_URL);

        expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(2);
    });
});

describe("crawl returns no results", () => {
    let response: CrawlerResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        const source = EMPTY;
        mockCrawlProvider.crawl.mockReturnValue(source);

        response = await crawler.crawl(DEFAULT_BASE_URL);
    });

    test("does not call url repository", () => {
        expect(mockURLRepository.storePathname).not.toBeCalled();
    });

    test("does not call content repository", () => {
        expect(mockContentRepository.storePageContent).not.toBeCalled();
    });

    test("returns failure", () => {
        expect(response.success).toBe(false);
    });

    test("returns no pathnames", () => {
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
            let response: CrawlerResponse;

            beforeAll(async () => {
                jest.resetAllMocks();

                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.storePathname.mockResolvedValue(true);
                mockContentRepository.storePageContent.mockResolvedValue(true);

                response = await crawler.crawl(DEFAULT_BASE_URL);
            });

            test("calls the url repository for each success", () => {
                expect(mockURLRepository.storePathname).toHaveBeenCalledTimes(
                    expectedPathnames.length
                );
            });

            test("calls the content repository for each success", () => {
                expect(
                    mockContentRepository.storePageContent
                ).toHaveBeenCalledTimes(expectedPathnames.length);
            });

            test("returns failure", () => {
                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", () => {
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
            let response: CrawlerResponse;

            beforeAll(async () => {
                jest.resetAllMocks();

                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                for (const result of failureSequence) {
                    mockURLRepository.storePathname.mockResolvedValueOnce(
                        result
                    );
                }
                mockContentRepository.storePageContent.mockResolvedValue(true);

                response = await crawler.crawl(DEFAULT_BASE_URL);
            });

            test("only calls content repository after url stored successfully", () => {
                expect(mockContentRepository.storePageContent).toBeCalledTimes(
                    expectedPathnames.length
                );
            });

            test("returns failure", () => {
                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", () => {
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
            let response: CrawlerResponse;

            beforeAll(async () => {
                jest.resetAllMocks();

                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.storePathname.mockResolvedValue(true);
                for (const result of failureSequence) {
                    mockContentRepository.storePageContent.mockResolvedValueOnce(
                        result
                    );
                }

                response = await crawler.crawl(DEFAULT_BASE_URL);
            });

            test("returns failure", () => {
                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", () => {
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
            let response: CrawlerResponse;

            beforeAll(async () => {
                jest.resetAllMocks();

                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
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

                response = await crawler.crawl(DEFAULT_BASE_URL);
            });

            test("only calls content repository after url stored successfully", () => {
                expect(mockContentRepository.storePageContent).toBeCalledTimes(
                    expectedPathnames.length
                );
            });

            test("returns failure", () => {
                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", () => {
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
            let response: CrawlerResponse;

            beforeAll(async () => {
                jest.resetAllMocks();

                mockCrawlProvider.crawl.mockReturnValue(crawlResults);
                mockURLRepository.storePathname.mockResolvedValue(true);
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

                response = await crawler.crawl(DEFAULT_BASE_URL);
            });

            test("returns failure", () => {
                expect(response.success).toBe(false);
            });

            test("returns pathnames crawled up to failure", () => {
                expect(response.pathnames).toHaveLength(
                    expectedPathnames.length
                );

                expect(response.pathnames).toEqual(
                    expect.arrayContaining(expectedPathnames)
                );
            });
        }
    );
});
