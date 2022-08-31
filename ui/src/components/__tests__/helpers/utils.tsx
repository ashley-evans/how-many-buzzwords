import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { render } from "@testing-library/react";

import { CRAWL_STATUS_UPDATE_SUBSCRIPTION } from "../../CrawlingSpinner";
import START_CRAWL_MUTATION from "../../../graphql/StartCrawlMutation";
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

function createStartCrawlMock(started: boolean, url: string) {
    return {
        request: {
            query: START_CRAWL_MUTATION,
            variables: { input: { url } },
        },
        result: jest.fn(() => ({
            data: {
                startCrawl: { started },
            },
        })),
    };
}

function mockComponent<PropType>(
    moduleName: string,
    mockImplementation: jest.Mock = jest.fn()
) {
    const mockedComponent = (props: PropType) => {
        mockImplementation(props);

        return <></>;
    };

    jest.mock(moduleName, () => mockedComponent);
}

export {
    renderWithMockProvider,
    createStatusUpdateMock,
    createStartCrawlMock,
    mockComponent,
};
