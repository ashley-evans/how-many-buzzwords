import path from "path";
import { Observable } from "rxjs";
import nock from "nock";
import { Scope } from "nock/types";
import { PathOrFileDescriptor, readFileSync } from "fs";

import { init, clean, destroy } from "./helpers/local-storage-emulator";
import { mockURLFromFile } from "../../../../../../helpers/http-mock";

import { ApifyProvider, CrawlerSettings } from "../ApifyProvider";
import { CrawlResult } from "../../ports/CrawlProvider";

const ENTRY_POINT_URL = new URL("http://www.example.com");

const LOCAL_STORAGE_DIR = path.join(__dirname, "/apify_storage");
const ASSET_FOLDER = path.join(__dirname, "/assets/");
const DEPTH_FOLDER = path.join(ASSET_FOLDER, "/depth");
const DEPTH_PATH_PREFIX = "/depth-";

const DEPTH_ENTRY_POINT_URL = new URL(
    `${ENTRY_POINT_URL.origin}${DEPTH_PATH_PREFIX}0`
);

const MAX_REQUESTS = 10;
const MAX_CRAWL_DEPTH = 3;
const DEFAULT_SETTINGS: CrawlerSettings = {
    maxCrawlDepth: MAX_CRAWL_DEPTH,
    maxRequests: MAX_REQUESTS,
};
const BEYOND_MAX_DEPTH = MAX_CRAWL_DEPTH + 1;

function receiveObservableOutput<T>(observable: Observable<T>): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const results: T[] = [];
        observable.subscribe({
            next: (value) => results.push(value),
            complete: () => resolve(results),
            error: (ex) => reject(ex),
        });
    });
}

function mockDepthURLs(depth: number): Scope[] {
    const mocks: Scope[] = [];
    for (let i = 0; i <= depth; i++) {
        const mock = mockURLFromFile(
            ENTRY_POINT_URL,
            `${DEPTH_PATH_PREFIX}${i}`,
            path.join(DEPTH_FOLDER, `depth-${i}.html`),
            false
        );
        mocks.push(mock);
    }

    return mocks;
}

function getPageContent(path: PathOrFileDescriptor): string {
    return readFileSync(path).toString("utf-8");
}

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    init(LOCAL_STORAGE_DIR);
});

beforeEach(() => {
    clean();
});

describe("crawler crawls to sub pages linked from start page", () => {
    const entryPointContentPath = path.join(ASSET_FOLDER, "entry-point.html");
    const subPageContentPath = path.join(ASSET_FOLDER, "sub-page-1.html");

    const expectedChildPath = "/sub-page-1";

    let entryURLMock: Scope;
    let subPageMock: Scope;

    let response: CrawlResult[];

    beforeAll(async () => {
        clean();
        entryURLMock = mockURLFromFile(
            ENTRY_POINT_URL,
            ENTRY_POINT_URL.pathname,
            entryPointContentPath,
            false
        );
        subPageMock = mockURLFromFile(
            ENTRY_POINT_URL,
            expectedChildPath,
            subPageContentPath,
            false
        );
        const provider = new ApifyProvider(DEFAULT_SETTINGS);
        const observable = provider.crawl(ENTRY_POINT_URL);

        response = await receiveObservableOutput(observable);
    });

    test("crawler hits all URLs linked from starting URL once", () => {
        expect(entryURLMock.isDone()).toBe(true);
        expect(subPageMock.isDone()).toBe(true);
    });

    test("crawler returns all URLs linked from starting URL", () => {
        expect(response).toHaveLength(2);

        const responseBaseURL = response[0].url;
        const responseChildURL = response[1].url;

        expect(responseBaseURL.origin).toEqual(ENTRY_POINT_URL.origin);
        expect(responseBaseURL.pathname).toEqual(ENTRY_POINT_URL.pathname);

        expect(responseChildURL.origin).toEqual(ENTRY_POINT_URL.origin);
        expect(responseChildURL.pathname).toEqual(expectedChildPath);
    });

    test("crawler returns the content of each page crawled", () => {
        const expectedEntryContent = getPageContent(entryPointContentPath);
        const subPageContent = getPageContent(subPageContentPath);

        expect(response[0].content).toEqual(expectedEntryContent);
        expect(response[1].content).toEqual(subPageContent);
    });
});

test("crawler only returns one URL if page only refers to itself", async () => {
    const expectedCirclePath = "/circle";
    mockURLFromFile(
        ENTRY_POINT_URL,
        expectedCirclePath,
        path.join(ASSET_FOLDER, "circle.html"),
        true
    );
    const provider = new ApifyProvider(DEFAULT_SETTINGS);
    const circleURL = new URL(`${ENTRY_POINT_URL.origin}${expectedCirclePath}`);

    const observable = provider.crawl(circleURL);
    const response = await receiveObservableOutput(observable);

    expect(response).toHaveLength(1);
    expect(response[0].url).toEqual(circleURL);
});

describe("crawls to default depth given no depth specified", () => {
    let mockSites: Scope[];
    let response: CrawlResult[];

    beforeAll(async () => {
        clean();
        mockSites = mockDepthURLs(BEYOND_MAX_DEPTH);

        const provider = new ApifyProvider(DEFAULT_SETTINGS);
        response = await receiveObservableOutput(
            provider.crawl(DEPTH_ENTRY_POINT_URL)
        );
    });

    test("crawler hits urls until expected depth is reached", () => {
        for (let i = 0; i <= MAX_CRAWL_DEPTH; i++) {
            expect(mockSites[i].isDone()).toBe(true);
        }
    });

    test("crawler does not hit urls after expected depth is reached", () => {
        expect(mockSites[BEYOND_MAX_DEPTH].isDone()).toBe(false);
    });

    test("crawler returns URLs up to maximum crawl depth", () => {
        expect(response).toHaveLength(MAX_CRAWL_DEPTH + 1);

        for (let i = 0; i <= MAX_CRAWL_DEPTH; i++) {
            expect(response).toContainEqual(
                expect.objectContaining({
                    url: new URL(
                        `${ENTRY_POINT_URL.origin}${DEPTH_PATH_PREFIX}${i}`
                    ),
                })
            );
        }
    });

    afterAll(() => {
        nock.cleanAll();
    });
});

describe("crawls to specified depth given less than default", () => {
    const specifiedDepth = 1;
    const expectedCrawlLength = specifiedDepth + 1;

    let mockSites: Scope[];
    let response: CrawlResult[];

    beforeAll(async () => {
        clean();
        mockSites = mockDepthURLs(BEYOND_MAX_DEPTH);

        const provider = new ApifyProvider(DEFAULT_SETTINGS);
        response = await receiveObservableOutput(
            provider.crawl(DEPTH_ENTRY_POINT_URL, specifiedDepth)
        );
    });

    test("crawler hits urls until expected depth is reached", () => {
        for (let i = 0; i < expectedCrawlLength; i++) {
            expect(mockSites[i].isDone()).toBe(true);
        }
    });

    test("crawler does not hit urls after expected depth is reached", () => {
        for (let i = expectedCrawlLength; i <= BEYOND_MAX_DEPTH; i++) {
            expect(mockSites[i].isDone()).toBe(false);
        }
    });

    test("crawler returns URLs up to maximum crawl depth", () => {
        expect(response).toHaveLength(expectedCrawlLength);

        for (let i = 0; i < expectedCrawlLength; i++) {
            expect(response).toContainEqual(
                expect.objectContaining({
                    url: new URL(
                        `${ENTRY_POINT_URL.origin}${DEPTH_PATH_PREFIX}${i}`
                    ),
                })
            );
        }
    });

    afterAll(() => {
        nock.cleanAll();
    });
});

describe("crawls to default max depth given larger specified depth", () => {
    let mockSites: Scope[];
    let response: CrawlResult[];

    beforeAll(async () => {
        clean();
        mockSites = mockDepthURLs(BEYOND_MAX_DEPTH);

        const provider = new ApifyProvider(DEFAULT_SETTINGS);
        response = await receiveObservableOutput(
            provider.crawl(DEPTH_ENTRY_POINT_URL, BEYOND_MAX_DEPTH)
        );
    });

    test("crawler hits urls until expected depth is reached", () => {
        for (let i = 0; i <= MAX_CRAWL_DEPTH; i++) {
            expect(mockSites[i].isDone()).toBe(true);
        }
    });

    test("crawler does not hit urls after expected depth is reached", () => {
        expect(mockSites[BEYOND_MAX_DEPTH].isDone()).toBe(false);
    });

    test("crawler returns URLs up to maximum crawl depth", () => {
        expect(response).toHaveLength(MAX_CRAWL_DEPTH + 1);

        for (let i = 0; i <= MAX_CRAWL_DEPTH; i++) {
            expect(response).toContainEqual(
                expect.objectContaining({
                    url: new URL(
                        `${ENTRY_POINT_URL.origin}${DEPTH_PATH_PREFIX}${i}`
                    ),
                })
            );
        }
    });

    afterAll(() => {
        nock.cleanAll();
    });
});

describe("crawls to max number of requests specified", () => {
    const maxRequests = MAX_CRAWL_DEPTH - 1;

    let mockSites: Scope[];
    let response: CrawlResult[];

    beforeAll(async () => {
        clean();
        mockSites = mockDepthURLs(BEYOND_MAX_DEPTH);
        const settings: CrawlerSettings = {
            maxCrawlDepth: MAX_CRAWL_DEPTH,
            maxRequests: maxRequests,
        };

        const provider = new ApifyProvider(settings);
        response = await receiveObservableOutput(
            provider.crawl(DEPTH_ENTRY_POINT_URL, BEYOND_MAX_DEPTH)
        );
    });

    test("crawler hits urls until max requests is reached", () => {
        for (let i = 0; i < maxRequests; i++) {
            expect(mockSites[i].isDone()).toBe(true);
        }
    });

    test("crawler does not hit urls after expected depth is reached", () => {
        for (let i = maxRequests; i <= BEYOND_MAX_DEPTH; i++) {
            expect(mockSites[i].isDone()).toBe(false);
        }
    });

    test("crawler returns URLs up to max requests", () => {
        expect(response).toHaveLength(maxRequests);

        for (let i = 0; i < maxRequests; i++) {
            expect(response).toContainEqual(
                expect.objectContaining({
                    url: new URL(
                        `${ENTRY_POINT_URL.origin}${DEPTH_PATH_PREFIX}${i}`
                    ),
                })
            );
        }
    });

    afterAll(() => {
        nock.cleanAll();
    });
});

describe("crawls to pages only inside same domain name", () => {
    const externalURL = new URL("http://www.external-example.com/");
    const domainPathnameURL = new URL(
        "https://www.twitter.com/share?url=http://www.example.com/"
    );

    let externalURLMock: Scope;
    let domainPathnameMock: Scope;

    let response: CrawlResult[];

    beforeAll(async () => {
        clean();
        mockURLFromFile(
            ENTRY_POINT_URL,
            ENTRY_POINT_URL.pathname,
            path.join(ASSET_FOLDER, "external.html"),
            false
        );
        externalURLMock = mockURLFromFile(
            new URL(externalURL.origin),
            externalURL.pathname,
            path.join(ASSET_FOLDER, "sub-page-1.html"),
            false
        );
        domainPathnameMock = mockURLFromFile(
            new URL(domainPathnameURL.origin),
            `${domainPathnameURL.pathname}${domainPathnameURL.search}`,
            path.join(ASSET_FOLDER, "sub-page-1.html"),
            false
        );

        const provider = new ApifyProvider(DEFAULT_SETTINGS);
        const observable = provider.crawl(ENTRY_POINT_URL);

        response = await receiveObservableOutput(observable);
    });

    test("crawler does not hit external sites", () => {
        expect(externalURLMock.isDone()).toBe(false);
        expect(domainPathnameMock.isDone()).toBe(false);
    });

    test("crawler only returns URLs inside domain", () => {
        expect(response).toHaveLength(1);
        expect(response[0].url).toEqual(ENTRY_POINT_URL);
    });
});

afterAll(() => {
    destroy();
});
