import { mock } from "jest-mock-extended";
import {
    CrawlStatus,
    Repository,
} from "buzzword-aws-crawl-urls-repository-library";

import UpdateStatusDomain from "../UpdateStatusDomain";

const mockRepository = mock<Repository>();

const domain = new UpdateStatusDomain(mockRepository);

const EXPECTED_URL = new URL("https://www.example.com/");

beforeEach(() => {
    mockRepository.updateCrawlStatus.mockReset();
});

test("returns success if the crawl status update was successful", async () => {
    mockRepository.updateCrawlStatus.mockResolvedValue(true);

    const actual = await domain.updateCrawlStatus(
        EXPECTED_URL,
        CrawlStatus.COMPLETE
    );

    expect(actual).toEqual(true);
});

test.each(Object.values(CrawlStatus))(
    "calls the url repository to update the crawl status to %s for the provided URL",
    async (expectedStatus: CrawlStatus) => {
        await domain.updateCrawlStatus(EXPECTED_URL, expectedStatus);

        expect(mockRepository.updateCrawlStatus).toHaveBeenCalledTimes(1);
        expect(mockRepository.updateCrawlStatus).toHaveBeenCalledWith(
            EXPECTED_URL.hostname,
            expectedStatus
        );
    }
);
