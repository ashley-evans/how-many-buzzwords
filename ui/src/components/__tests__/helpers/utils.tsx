import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { render } from "@testing-library/react";

import { CRAWL_STATUS_UPDATE_SUBSCRIPTION } from "../../CrawlingSpinner";
import CrawlStatus from "../../../enums/CrawlStatus";

function renderWithMockProvider(
    component: React.ReactNode,
    mocks?: MockedResponse<Record<string, unknown>>[]
) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            {component}
        </MockedProvider>
    );
}

function createStatusUpdateMock(mockStatus: CrawlStatus, expectedURL: string) {
    return {
        request: {
            query: CRAWL_STATUS_UPDATE_SUBSCRIPTION,
            variables: { url: expectedURL },
        },
        result: jest.fn(() => ({
            data: {
                crawlStatusUpdated: { status: mockStatus },
            },
        })),
    };
}

export { renderWithMockProvider, createStatusUpdateMock };
