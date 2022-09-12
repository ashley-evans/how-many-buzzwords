import { mock } from "jest-mock-extended";
import {
    CrawlStatus,
    Repository,
} from "buzzword-crawl-urls-repository-library";

import UpdateStatusDomain from "../UpdateStatusDomain";
import EventClient from "../../ports/EventClient";

const mockRepository = mock<Repository>();
const mockEventClient = mock<EventClient>();

const domain = new UpdateStatusDomain(mockRepository, mockEventClient);

const EXPECTED_URL = new URL("https://www.example.com/");

beforeEach(() => {
    mockRepository.updateCrawlStatus.mockReset();
    mockEventClient.sentStatusUpdate.mockReset();
});

test("returns success if the crawl status update and event publish were successful", async () => {
    mockRepository.updateCrawlStatus.mockResolvedValue(true);
    mockEventClient.sentStatusUpdate.mockResolvedValue(true);

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

test("calls the event client to publish status update if crawl status update was successful", async () => {
    const expectedStatus = CrawlStatus.COMPLETE;
    mockRepository.updateCrawlStatus.mockResolvedValue(true);

    await domain.updateCrawlStatus(EXPECTED_URL, expectedStatus);

    expect(mockEventClient.sentStatusUpdate).toHaveBeenCalledTimes(1);
    expect(mockEventClient.sentStatusUpdate).toHaveBeenCalledWith(
        EXPECTED_URL.hostname,
        expectedStatus
    );
});

test("does not call the event client if an unhandled exception occurs while updating crawl status in repository", async () => {
    mockRepository.updateCrawlStatus.mockRejectedValue(new Error());

    await domain.updateCrawlStatus(EXPECTED_URL, CrawlStatus.COMPLETE);

    expect(mockEventClient.sentStatusUpdate).not.toHaveBeenCalled();
});

test("does not call the event client if the crawl status update failed", async () => {
    mockRepository.updateCrawlStatus.mockResolvedValue(false);

    await domain.updateCrawlStatus(EXPECTED_URL, CrawlStatus.COMPLETE);

    expect(mockEventClient.sentStatusUpdate).not.toHaveBeenCalled();
});

test("returns failure if an unhandled exception occurs while updating crawl status in repository", async () => {
    mockRepository.updateCrawlStatus.mockRejectedValue(new Error());

    const actual = await domain.updateCrawlStatus(
        EXPECTED_URL,
        CrawlStatus.COMPLETE
    );

    expect(actual).toEqual(false);
});

test("returns failure if the repository fails to update the crawl status for the given URL", async () => {
    mockRepository.updateCrawlStatus.mockResolvedValue(false);

    const actual = await domain.updateCrawlStatus(
        EXPECTED_URL,
        CrawlStatus.COMPLETE
    );

    expect(actual).toEqual(false);
});

test("returns failure if an unhandled exception occurs while sending status update event", async () => {
    mockRepository.updateCrawlStatus.mockResolvedValue(true);
    mockEventClient.sentStatusUpdate.mockRejectedValue(new Error());

    const actual = await domain.updateCrawlStatus(
        EXPECTED_URL,
        CrawlStatus.COMPLETE
    );

    expect(actual).toEqual(false);
});

test("returns failure if the event client fails to send the status update", async () => {
    mockRepository.updateCrawlStatus.mockResolvedValue(true);
    mockEventClient.sentStatusUpdate.mockResolvedValue(false);

    const actual = await domain.updateCrawlStatus(
        EXPECTED_URL,
        CrawlStatus.COMPLETE
    );

    expect(actual).toEqual(false);
});
