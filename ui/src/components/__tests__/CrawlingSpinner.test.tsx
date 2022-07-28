import React from "react";
import { waitFor } from "@testing-library/react";

import {
    createStatusUpdateMock,
    renderWithMockProvider,
} from "./helpers/utils";
import { CrawlingSpinner } from "../CrawlingSpinner";
import CrawlStatus from "../../enums/CrawlStatus";

const VALID_URL = "www.example.com";

const MOCK_STATUS_UPDATE = jest.fn();

beforeEach(() => {
    MOCK_STATUS_UPDATE.mockClear();
});

test("subscribes to crawl status updates given a valid URL", async () => {
    const mock = createStatusUpdateMock(CrawlStatus.STARTED, VALID_URL);

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
            [createStatusUpdateMock(status, VALID_URL)]
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

test("displays crawling message", async () => {
    const expectedMessage = "Crawling...";

    const { getByText } = renderWithMockProvider(
        <CrawlingSpinner url={VALID_URL} onStatusUpdate={MOCK_STATUS_UPDATE} />,
        []
    );

    await waitFor(() => expect(getByText(expectedMessage)).toBeInTheDocument());
});
