import React from "react";
import {
    fireEvent,
    render,
    waitFor,
    waitForElementToBeRemoved,
} from "@testing-library/react";
import { mock } from "jest-mock-extended";

import App from "../App";
import CrawlServiceClient from "../../clients/interfaces/CrawlServiceClient";
import KeyphraseServiceClientFactory from "../../clients/interfaces/KeyphraseServiceClientFactory";

const APPLICATION_TITLE = "How many buzzwords";
const URL_INPUT_LABEL = "URL:";
const SEARCH_BUTTON_TEXT = "Search!";
const CRAWLING_MESSAGE = "Crawling...";

const VALID_URL = "http://www.example.com/";
const INVALID_URL = "not a valid URL";

const mockCrawlClient = mock<CrawlServiceClient>();
const mockKeyphraseClientFactory = mock<KeyphraseServiceClientFactory>();

beforeEach(() => {
    jest.resetAllMocks();
});

describe("field rendering", () => {
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

describe("process screen rendering", () => {
    test("renders the title of the site while crawling", async () => {
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
        await waitFor(() => expect(mockCrawlClient.crawl).toHaveBeenCalled());

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

    test("does not render the URL input form while crawling", async () => {
        const { getByRole, queryByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        await waitFor(() => expect(mockCrawlClient.crawl).toHaveBeenCalled());

        expect(queryByRole("textbox", { name: URL_INPUT_LABEL })).toBeNull();
        expect(queryByRole("button", { name: SEARCH_BUTTON_TEXT })).toBeNull();
    });

    test("renders loading message while crawling", async () => {
        const { getByRole, getByText } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        await waitFor(() => {
            expect(getByText(CRAWLING_MESSAGE)).toBeInTheDocument();
        });
    });
});

test("calls crawl service to initiate call given a valid URL", async () => {
    const { getByRole, queryByText } = render(
        <App
            crawlServiceClient={mockCrawlClient}
            keyphraseServiceClientFactory={mockKeyphraseClientFactory}
        />
    );
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
    await waitForElementToBeRemoved(() => queryByText(CRAWLING_MESSAGE));

    expect(mockCrawlClient.crawl).toHaveBeenCalledTimes(1);
    expect(mockCrawlClient.crawl).toHaveBeenCalledWith(new URL(VALID_URL));
});

test("does not call crawl service to initiate crawl given an invalid URL", () => {
    const { getByRole } = render(
        <App
            crawlServiceClient={mockCrawlClient}
            keyphraseServiceClientFactory={mockKeyphraseClientFactory}
        />
    );
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: INVALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

    expect(mockCrawlClient.crawl).toHaveBeenCalledTimes(0);
});

test("removes loading message after crawl completes", async () => {
    const { getByRole, queryByText } = render(
        <App
            crawlServiceClient={mockCrawlClient}
            keyphraseServiceClientFactory={mockKeyphraseClientFactory}
        />
    );
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

    await waitFor(() => {
        expect(queryByText(CRAWLING_MESSAGE)).not.toBeInTheDocument();
    });
});

describe("crawl error rendering", () => {
    test("renders an error message if an unhandled exception is thrown by the crawl client", async () => {
        const expectedErrorMessage =
            "An error occurred when searching for buzzwords, please try again.";
        mockCrawlClient.crawl.mockRejectedValue(new Error());
        const { getByRole, queryByText } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        await waitFor(() => {
            expect(queryByText(expectedErrorMessage)).toBeInTheDocument();
        });
    });

    test("renders an error message if the crawl service returns an error", async () => {
        const expectedErrorMessage =
            "An error occurred when searching for buzzwords, please try again.";
        mockCrawlClient.crawl.mockResolvedValue(false);
        const { getByRole, queryByText } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        await waitFor(() => {
            expect(queryByText(expectedErrorMessage)).toBeInTheDocument();
        });
    });

    test("clears error message following re-crawl", async () => {
        const expectedErrorMessage =
            "An error occurred when searching for buzzwords, please try again.";
        mockCrawlClient.crawl.mockRejectedValueOnce(new Error());
        const { getByRole, queryByText } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        await waitFor(() => {
            expect(queryByText(expectedErrorMessage)).toBeInTheDocument();
        });
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        await waitFor(() => {
            expect(queryByText(expectedErrorMessage)).not.toBeInTheDocument();
        });
    });
});

describe("web socket connection initiation handling", () => {
    test("creates a client to listen to keyphrase occurrence results given valid URL submitted", async () => {
        mockCrawlClient.crawl.mockResolvedValue(true);
        const { getByRole, queryByText } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        await waitForElementToBeRemoved(() => queryByText(CRAWLING_MESSAGE));

        expect(mockKeyphraseClientFactory.createClient).toHaveBeenCalledTimes(
            1
        );
        expect(mockKeyphraseClientFactory.createClient).toHaveBeenCalledWith(
            new URL(VALID_URL)
        );
    });

    test("does not create any keyphrase service clients given an invalid URL submitted", () => {
        mockCrawlClient.crawl.mockResolvedValue(true);
        const { getByRole } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: INVALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        expect(mockKeyphraseClientFactory.createClient).toHaveBeenCalledTimes(
            0
        );
    });

    test("does not create a keyphrase service client if the crawl fails to start", async () => {
        mockCrawlClient.crawl.mockResolvedValue(false);
        const { getByRole, queryByText } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        await waitForElementToBeRemoved(() => queryByText(CRAWLING_MESSAGE));

        expect(mockKeyphraseClientFactory.createClient).toHaveBeenCalledTimes(
            0
        );
    });

    test("does not create a keyphrase service client if the crawl service client throws an unhandled exception", async () => {
        mockCrawlClient.crawl.mockRejectedValue(new Error());
        const { getByRole, queryByText } = render(
            <App
                crawlServiceClient={mockCrawlClient}
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });

        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        await waitForElementToBeRemoved(() => queryByText(CRAWLING_MESSAGE));

        expect(mockKeyphraseClientFactory.createClient).toHaveBeenCalledTimes(
            0
        );
    });
});
