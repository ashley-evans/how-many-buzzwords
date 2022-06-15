import React from "react";
import { render } from "@testing-library/react";
import { mock } from "jest-mock-extended";
import { from } from "rxjs";

import App from "../App";
import CrawlServiceClient from "../../clients/interfaces/CrawlServiceClient";
import KeyphraseServiceClientFactory from "../../clients/interfaces/KeyphraseServiceClientFactory";
import { KeyphraseServiceClient } from "../../clients/interfaces/KeyphraseServiceClient";

const APPLICATION_TITLE = "How many buzzwords";

const mockCrawlClient = mock<CrawlServiceClient>();
const mockKeyphraseClientFactory = mock<KeyphraseServiceClientFactory>();
const mockKeyphraseClient = mock<KeyphraseServiceClient>();

beforeEach(() => {
    jest.resetAllMocks();
});

describe("navigating to root", () => {
    test("displays the title of the site in a header", () => {
        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

    test("displays a URL textbox with an appropriate label", () => {
        const expectedURLInputLabel = "URL:";

        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );

        expect(
            getByRole("textbox", { name: expectedURLInputLabel })
        ).toBeInTheDocument();
    });

    test("displays a search button", () => {
        const expectedSearchButtonText = "Search!";

        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );

        expect(
            getByRole("button", { name: expectedSearchButtonText })
        ).toBeInTheDocument();
    });
});

describe("navigating to results with valid encoded URL", () => {
    const expectedURL = "https://www.example.com/";

    beforeEach(() => {
        mockKeyphraseClientFactory.createClient.mockReturnValue(
            mockKeyphraseClient
        );
        mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(from([]));

        window.history.pushState(
            {},
            "",
            `/results/${encodeURIComponent(expectedURL)}`
        );
    });

    test("displays the title of the site in a header", () => {
        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

    test("renders results header", () => {
        const expectedHeader = `Results for: ${expectedURL}`;

        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );

        expect(
            getByRole("heading", { name: expectedHeader })
        ).toBeInTheDocument();
    });
});
