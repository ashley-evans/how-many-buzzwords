import React from "react";
import { fireEvent, waitFor } from "@testing-library/react";
import { GraphQLError } from "graphql";
import { MemoryRouter } from "react-router-dom";

import {
    renderWithMockProvider,
    createStatusUpdateMock,
} from "./helpers/utils";
import { Search, START_CRAWL_MUTATION } from "../Search";
import CrawlStatus from "../../enums/CrawlStatus";

const URL_INPUT_LABEL = "URL";
const SEARCH_BUTTON_TEXT = "Search!";
const CRAWLING_MESSAGE = "Crawling...";

const VALID_URL = new URL("http://www.example.com/");
const INVALID_URL = "not a valid URL";

const HOSTNAME_START_CRAWL_MOCK = {
    request: {
        query: START_CRAWL_MUTATION,
        variables: { input: { url: VALID_URL.hostname } },
    },
    result: jest.fn(() => ({
        data: {
            startCrawl: { started: true },
        },
    })),
};

beforeEach(() => {
    HOSTNAME_START_CRAWL_MOCK.result.mockClear();
});

describe("field rendering", () => {
    test("displays a URL textbox with an appropriate label", () => {
        const { getByRole } = renderWithMockProvider(<Search />);

        expect(
            getByRole("textbox", { name: URL_INPUT_LABEL })
        ).toBeInTheDocument();
    });

    test("displays a search button", () => {
        const { getByRole } = renderWithMockProvider(<Search />);

        expect(
            getByRole("button", { name: SEARCH_BUTTON_TEXT })
        ).toBeInTheDocument();
    });
});

test("calls crawl service to initiate call given a valid URL", async () => {
    const { getByRole } = renderWithMockProvider(
        <MemoryRouter>
            <Search />
        </MemoryRouter>,
        [HOSTNAME_START_CRAWL_MOCK]
    );
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

    await waitFor(() =>
        expect(HOSTNAME_START_CRAWL_MOCK.result).toHaveBeenCalled()
    );
});

test("subscribes to crawl status updates given valid URL", async () => {
    const subscriptionMock = createStatusUpdateMock(
        CrawlStatus.STARTED,
        VALID_URL.hostname
    );

    const { getByRole } = renderWithMockProvider(
        <MemoryRouter>
            <Search />
        </MemoryRouter>,
        [HOSTNAME_START_CRAWL_MOCK, subscriptionMock]
    );
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

    await waitFor(() => expect(subscriptionMock.result).toHaveBeenCalled());
});

test("does not call crawl service to initiate crawl or subscribe to crawl status updatesgiven an invalid URL", async () => {
    const subscriptionMock = createStatusUpdateMock(
        CrawlStatus.STARTED,
        INVALID_URL
    );
    const { getByRole } = renderWithMockProvider(<Search />, [
        HOSTNAME_START_CRAWL_MOCK,
        subscriptionMock,
    ]);

    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: INVALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
    await waitFor(() => {
        expect(getByRole("alert")).toHaveTextContent(
            "Please enter a valid URL"
        );
    });

    expect(HOSTNAME_START_CRAWL_MOCK.result).not.toHaveBeenCalled();
    expect(subscriptionMock.result).not.toHaveBeenCalled();
});

describe("process screen rendering", () => {
    test("does not render the URL input form while crawl is in progress", async () => {
        const startedSubscriptionMock = createStatusUpdateMock(
            CrawlStatus.STARTED,
            VALID_URL.hostname
        );

        const { getByRole, queryByRole } = renderWithMockProvider(
            <MemoryRouter>
                <Search />
            </MemoryRouter>,
            [HOSTNAME_START_CRAWL_MOCK, startedSubscriptionMock]
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        await waitFor(() =>
            expect(startedSubscriptionMock.result).toHaveBeenCalled()
        );

        expect(
            queryByRole("textbox", { name: URL_INPUT_LABEL })
        ).not.toBeInTheDocument();
        expect(
            queryByRole("button", { name: SEARCH_BUTTON_TEXT })
        ).not.toBeInTheDocument();
    });

    test("renders crawling message while crawl is in progress", async () => {
        const startedSubscriptionMock = createStatusUpdateMock(
            CrawlStatus.STARTED,
            VALID_URL.hostname
        );

        const { getByRole, getByText } = renderWithMockProvider(
            <MemoryRouter>
                <Search />
            </MemoryRouter>,
            [HOSTNAME_START_CRAWL_MOCK, startedSubscriptionMock]
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

describe("crawl error rendering", () => {
    const expectedErrorMessage =
        "An error occurred when searching for buzzwords, please try again.";
    test("renders an error message if a network error occurs starting the crawl", async () => {
        const networkErrorMock = {
            request: {
                query: START_CRAWL_MUTATION,
                variables: { url: VALID_URL.hostname },
            },
            error: new Error("test"),
        };

        const { getByRole, queryByText } = renderWithMockProvider(<Search />, [
            networkErrorMock,
        ]);
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        await waitFor(() => {
            expect(queryByText(expectedErrorMessage)).toBeInTheDocument();
        });
    });

    test("renders an error message if the crawl service returns an error", async () => {
        const graphQLErrorMock = {
            request: {
                query: START_CRAWL_MUTATION,
                variables: { url: VALID_URL.hostname },
            },
            result: {
                errors: [new GraphQLError("test")],
            },
        };

        const { getByRole, queryByText } = renderWithMockProvider(<Search />, [
            graphQLErrorMock,
        ]);
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        await waitFor(() => {
            expect(queryByText(expectedErrorMessage)).toBeInTheDocument();
        });
    });

    test("clears error message following re-crawl", async () => {
        const networkErrorMock = {
            request: {
                query: START_CRAWL_MUTATION,
                variables: { url: VALID_URL.hostname },
            },
            error: new Error("test"),
        };

        const { getByRole, queryByText } = renderWithMockProvider(<Search />, [
            networkErrorMock,
        ]);
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
