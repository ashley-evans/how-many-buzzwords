import React from "react";
import { fireEvent, waitFor } from "@testing-library/react";
import { mock } from "jest-mock-extended";
import { from } from "rxjs";
import path from "path";

import {
    renderWithMockProvider,
    createStatusUpdateMock,
    createStartCrawlMock,
    mockComponent,
} from "./helpers/utils";
import KeyphraseServiceClientFactory from "../../clients/interfaces/KeyphraseServiceClientFactory";
import { KeyphraseServiceClient } from "../../clients/interfaces/KeyphraseServiceClient";
import CrawlStatus from "../../enums/CrawlStatus";

mockComponent(path.join(__dirname, "..", "KeyphraseCloud"));
mockComponent(path.join(__dirname, "..", "KeyphraseCirclePacking"));

import App from "../App";

const APPLICATION_TITLE = "How many buzzwords";
const URL_INPUT_LABEL = "URL";
const SEARCH_BUTTON_TEXT = "Search!";

const VALID_URL = new URL("https://www.example.com/");

const mockKeyphraseClientFactory = mock<KeyphraseServiceClientFactory>();
const mockKeyphraseClient = mock<KeyphraseServiceClient>();

beforeEach(() => {
    mockKeyphraseClient.disconnect.mockClear();
    mockKeyphraseClient.getConfiguredEndpoint.mockClear();
    mockKeyphraseClient.observeKeyphraseResults.mockClear();
    mockKeyphraseClientFactory.createClient.mockClear();
});

describe("navigating to root", () => {
    test("displays the title of the site in a header", async () => {
        const { getByRole } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );

        await waitFor(() =>
            expect(
                getByRole("heading", { name: APPLICATION_TITLE })
            ).toBeInTheDocument()
        );
    });

    test("displays a URL textbox with an appropriate label", async () => {
        const { getByRole } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );

        await waitFor(() =>
            expect(
                getByRole("textbox", { name: URL_INPUT_LABEL })
            ).toBeInTheDocument()
        );
    });

    test("displays a search button", async () => {
        const { getByRole } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );

        await waitFor(() =>
            expect(
                getByRole("button", { name: SEARCH_BUTTON_TEXT })
            ).toBeInTheDocument()
        );
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
            `/results/${encodeURIComponent(VALID_URL.toString())}`
        );
    });

    test("displays the title of the site and results message in headers", async () => {
        const expectedResultsHeader = `Results for: ${VALID_URL}`;

        const { getByRole } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );

        await waitFor(() =>
            expect(
                getByRole("heading", { name: expectedResultsHeader })
            ).toBeInTheDocument()
        );
        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });
});

test.each([
    ["a missing url", undefined],
    ["an invalid encoded url", encodeURIComponent("not a valid URL")],
    ["an invalid encoded url (IP)", encodeURIComponent(0)],
])(
    "navigating to the results page with %s redirects to search page",
    async (message: string, url?: string) => {
        window.history.pushState({}, "", `/results/${url}`);

        const { getByRole } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );

        await waitFor(() =>
            expect(
                getByRole("textbox", { name: URL_INPUT_LABEL })
            ).toBeInTheDocument()
        );
        expect(
            getByRole("button", { name: SEARCH_BUTTON_TEXT })
        ).toBeInTheDocument();
    }
);

test("navigates to results page if crawl successfully completes", async () => {
    const completedSubscriptionMock = createStatusUpdateMock(
        CrawlStatus.COMPLETE,
        VALID_URL.hostname
    );
    const expectedHeader = `Results for: ${VALID_URL}`;
    const hostnameStartCrawlMock = createStartCrawlMock(
        true,
        VALID_URL.hostname
    );

    mockKeyphraseClientFactory.createClient.mockReturnValue(
        mockKeyphraseClient
    );
    mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(from([]));

    const { getByRole } = renderWithMockProvider(
        <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />,
        [hostnameStartCrawlMock, completedSubscriptionMock]
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
        `/results/${encodeURIComponent(VALID_URL.toString())}`
    );

    const { getByRole } = renderWithMockProvider(
        <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
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

describe("navigating to an unknown page", () => {
    const RETURN_LINK_TEXT = "Return to search";

    beforeEach(() => {
        window.history.pushState({}, "", `/unknown`);
    });

    test("displays the title of the site in a header", () => {
        const { getByRole } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

    test("renders a unknown page message", () => {
        const expectedUnknownPageText = "Oh no! You've gotten lost!";

        const { getByText } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );

        expect(getByText(expectedUnknownPageText)).toBeInTheDocument();
    });

    test("renders a return to search page link", () => {
        const { getByRole } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );

        expect(
            getByRole("link", { name: RETURN_LINK_TEXT })
        ).toBeInTheDocument();
    });

    test("navigates to search page if return to search link is pressed", async () => {
        const { getByRole } = renderWithMockProvider(
            <App keyphraseServiceClientFactory={mockKeyphraseClientFactory} />
        );
        fireEvent.click(getByRole("link", { name: RETURN_LINK_TEXT }));

        await waitFor(() =>
            expect(
                getByRole("textbox", { name: URL_INPUT_LABEL })
            ).toBeInTheDocument()
        );
        expect(
            getByRole("button", { name: SEARCH_BUTTON_TEXT })
        ).toBeInTheDocument();
    });
});
