import { mock } from "jest-mock-extended";
import {
    CrawlStatus,
    CrawlStatusRecord,
    Repository,
} from "buzzword-aws-crawl-urls-repository-library";

import RecentCrawlDomain from "../RecentCrawlDomain";

const MAX_AGE_HOURS = 1;
const VALID_URL = new URL("https://www.example.com/");

const mockRepository = mock<Repository>();
const domain = new RecentCrawlDomain(mockRepository, MAX_AGE_HOURS);

function createDate(hoursToAdd: number): Date {
    const date = new Date();
    date.setHours(date.getHours() + hoursToAdd);
    return date;
}

function createCrawlStatusRecord(
    status: CrawlStatus,
    date: Date
): CrawlStatusRecord {
    return {
        status,
        createdAt: date,
        updatedAt: date,
    };
}

beforeEach(() => {
    mockRepository.getCrawlStatus.mockReset();
});

describe.each([[CrawlStatus.STARTED], [CrawlStatus.COMPLETE]])(
    "given a crawl status of %s that was created before max age",
    (expectedStatus: CrawlStatus) => {
        const crawlStatusRecord = createCrawlStatusRecord(
            expectedStatus,
            createDate(MAX_AGE_HOURS * -1 - 1)
        );

        beforeEach(() => {
            mockRepository.getCrawlStatus.mockResolvedValue(crawlStatusRecord);
        });

        test("calls repository with hostname and pathname from provided URL", async () => {
            await domain.hasCrawledRecently(VALID_URL);

            expect(mockRepository.getCrawlStatus).toHaveBeenCalledTimes(1);
            expect(mockRepository.getCrawlStatus).toHaveBeenCalledWith(
                VALID_URL.hostname
            );
        });

        test("returns not crawled recently", async () => {
            const response = await domain.hasCrawledRecently(VALID_URL);

            expect(response?.recentlyCrawled).toEqual(false);
        });

        test("returns the status of the crawl", async () => {
            const response = await domain.hasCrawledRecently(VALID_URL);

            expect(response?.status).toEqual(expectedStatus);
        });

        test("returns time of the crawl status update", async () => {
            const response = await domain.hasCrawledRecently(VALID_URL);

            expect(response?.crawlTime).toEqual(crawlStatusRecord.createdAt);
        });
    }
);

describe.each([[CrawlStatus.STARTED], [CrawlStatus.COMPLETE]])(
    "given a crawl status of %s that was created after max age",
    (expectedStatus: CrawlStatus) => {
        const crawlStatusRecord = createCrawlStatusRecord(
            expectedStatus,
            createDate(MAX_AGE_HOURS)
        );

        beforeEach(() => {
            mockRepository.getCrawlStatus.mockResolvedValue(crawlStatusRecord);
        });

        test("calls repository with hostname and pathname from provided URL", async () => {
            await domain.hasCrawledRecently(VALID_URL);

            expect(mockRepository.getCrawlStatus).toHaveBeenCalledTimes(1);
            expect(mockRepository.getCrawlStatus).toHaveBeenCalledWith(
                VALID_URL.hostname
            );
        });

        test("returns crawled recently", async () => {
            const response = await domain.hasCrawledRecently(VALID_URL);

            expect(response?.recentlyCrawled).toEqual(true);
        });

        test("returns the status of the crawl", async () => {
            const response = await domain.hasCrawledRecently(VALID_URL);

            expect(response?.status).toEqual(expectedStatus);
        });

        test("returns time of the crawl status update", async () => {
            const response = await domain.hasCrawledRecently(VALID_URL);

            expect(response?.crawlTime).toEqual(crawlStatusRecord.createdAt);
        });
    }
);

test("returns undefined if no crawl status exists for provided URL", async () => {
    mockRepository.getCrawlStatus.mockResolvedValue(undefined);

    const actual = await domain.hasCrawledRecently(VALID_URL);

    expect(actual).toBeUndefined();
});
