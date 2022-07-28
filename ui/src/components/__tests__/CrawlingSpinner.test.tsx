import React from "react";
import { waitFor } from "@testing-library/react";

import { renderWithMockProvider } from "./helpers/utils";
import {
    CrawlingSpinner,
    CRAWL_STATUS_UPDATE_SUBSCRIPTION,
} from "../CrawlingSpinner";
import CrawlStatus from "../../enums/CrawlStatus";

const VALID_URL = "www.example.com";

const HOSTNAME_CRAWL_STARTED_STATUS_UPDATE_MOCK = {
    request: {
        query: CRAWL_STATUS_UPDATE_SUBSCRIPTION,
        variables: { url: VALID_URL },
    },
    result: jest.fn(() => ({
        data: {
            crawlStatusUpdated: { status: CrawlStatus.STARTED },
        },
    })),
};

test("subscribes to crawl status updates given a valid URL", async () => {
    renderWithMockProvider(<CrawlingSpinner url={VALID_URL} />, [
        HOSTNAME_CRAWL_STARTED_STATUS_UPDATE_MOCK,
    ]);

    await waitFor(() =>
        expect(
            HOSTNAME_CRAWL_STARTED_STATUS_UPDATE_MOCK.result
        ).toHaveBeenCalled()
    );
});
