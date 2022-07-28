import React from "react";
import { waitFor } from "@testing-library/react";

import { renderWithMockProvider } from "./helpers/utils";
import {
    CrawlingSpinner,
    CRAWL_STATUS_UPDATE_SUBSCRIPTION,
} from "../CrawlingSpinner";
import CrawlStatus from "../../enums/CrawlStatus";

const VALID_URL = "www.example.com";

const MOCK_STATUS_UPDATE = jest.fn();

function createStatusUpdateMock(mockStatus: CrawlStatus) {
    return {
        request: {
            query: CRAWL_STATUS_UPDATE_SUBSCRIPTION,
            variables: { url: VALID_URL },
        },
        result: jest.fn(() => ({
            data: {
                crawlStatusUpdated: { status: mockStatus },
            },
        })),
    };
}

beforeEach(() => {
    MOCK_STATUS_UPDATE.mockClear();
});

test("subscribes to crawl status updates given a valid URL", async () => {
    const mock = createStatusUpdateMock(CrawlStatus.STARTED);

    renderWithMockProvider(
        <CrawlingSpinner url={VALID_URL} onStatusUpdate={jest.fn()} />,
        [mock]
    );

    await waitFor(() => expect(mock.result).toHaveBeenCalled());
});

test.each(Object.values(CrawlStatus))(
    "calls on status update with new status if crawl status is updated to %s",
    async (status: CrawlStatus) => {
        renderWithMockProvider(
            <CrawlingSpinner
                url={VALID_URL}
                onStatusUpdate={MOCK_STATUS_UPDATE}
            />,
            [createStatusUpdateMock(status)]
        );

        await waitFor(() =>
            expect(MOCK_STATUS_UPDATE).toHaveBeenCalledTimes(1)
        );
        expect(MOCK_STATUS_UPDATE).toHaveBeenCalledWith(status);
    }
);

test("does not call on status update if no crawl status is given", async () => {
    renderWithMockProvider(
        <CrawlingSpinner url={VALID_URL} onStatusUpdate={MOCK_STATUS_UPDATE} />,
        []
    );

    await waitFor(() => expect(MOCK_STATUS_UPDATE).not.toHaveBeenCalled());
});
