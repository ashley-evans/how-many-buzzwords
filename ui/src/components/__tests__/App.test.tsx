import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { mock } from "jest-mock-extended";
import { from } from "rxjs";

import App from "../App";
import CrawlServiceClient from "../../clients/interfaces/CrawlServiceClient";
import KeyphraseServiceClientFactory from "../../clients/interfaces/KeyphraseServiceClientFactory";
import { KeyphraseServiceClient } from "../../clients/interfaces/KeyphraseServiceClient";

const APPLICATION_TITLE = "How many buzzwords";
const URL_INPUT_LABEL = "URL:";
const SEARCH_BUTTON_TEXT = "Search!";

const VALID_URL = "https://www.example.com/";

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
        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );

        expect(
            getByRole("textbox", { name: URL_INPUT_LABEL })
        ).toBeInTheDocument();
    });

    test("displays a search button", () => {
        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );

        expect(
            getByRole("button", { name: SEARCH_BUTTON_TEXT })
        ).toBeInTheDocument();
    });
});

describe("navigating to results with valid encoded URL", () => {
    beforeEach(() => {
        mockKeyphraseClientFactory.createClient.mockReturnValue(
            mockKeyphraseClient
        );
        mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(from([]));

        window.history.pushState(
            {},
            "",
            `/results/${encodeURIComponent(VALID_URL)}`
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
        const expectedHeader = `Results for: ${VALID_URL}`;

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

test.each([
    ["a missing url", undefined],
    ["an invalid encoded url", encodeURIComponent("not a valid URL")],
    ["an invalid encoded url (IP)", encodeURIComponent(0)],
])(
    "navigating to the results page with %s redirects to search page",
    (message: string, url?: string) => {
        window.history.pushState({}, "", `/results/${url}`);

        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );

        expect(
            getByRole("textbox", { name: URL_INPUT_LABEL })
        ).toBeInTheDocument();
        expect(
            getByRole("button", { name: SEARCH_BUTTON_TEXT })
        ).toBeInTheDocument();
    }
);

test("navigates to results page if crawl successfully initiates", async () => {
    const expectedHeader = `Results for: ${VALID_URL}`;
    mockCrawlClient.crawl.mockResolvedValue(true);
    mockKeyphraseClientFactory.createClient.mockReturnValue(
        mockKeyphraseClient
    );
    mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(from([]));

    const { getByRole } = render(
        <App
            crawlServiceClient={mockCrawlClient}
            keyphraseServiceClientFactory={mockKeyphraseClientFactory}
        />
    );
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

    await waitFor(() =>
        expect(
            getByRole("heading", { name: expectedHeader })
        ).toBeInTheDocument()
    );
});

test("navigates to search page if return button pressed on results page", async () => {
    const expectedReturnLinkText = "Return to search";
    mockKeyphraseClientFactory.createClient.mockReturnValue(
        mockKeyphraseClient
    );
    mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(from([]));
    window.history.pushState(
        {},
        "",
        `/results/${encodeURIComponent(VALID_URL)}`
    );

    const { getByRole } = render(
        <App
            crawlServiceClient={mockCrawlClient}
            keyphraseServiceClientFactory={mockKeyphraseClientFactory}
        />
    );
    fireEvent.click(getByRole("link", { name: expectedReturnLinkText }));

    await waitFor(() =>
        expect(
            getByRole("textbox", { name: URL_INPUT_LABEL })
        ).toBeInTheDocument()
    );
    expect(
        getByRole("button", { name: SEARCH_BUTTON_TEXT })
    ).toBeInTheDocument();
});
