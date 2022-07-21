import React from "react";
import { fireEvent, waitFor } from "@testing-library/react";
import { GraphQLError } from "graphql";

import { renderWithMockProvider } from "./helpers/utils";
import { Search, START_CRAWL_MUTATION } from "../Search";
import { MemoryRouter } from "react-router-dom";

const URL_INPUT_LABEL = "URL";
const SEARCH_BUTTON_TEXT = "Search!";
const CRAWLING_MESSAGE = "Initiating crawl...";

const VALID_URL = new URL("http://www.example.com/");
const INVALID_URL = "not a valid URL";

const HOSTNAME_MOCK = {
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
    HOSTNAME_MOCK.result.mockClear();
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

describe("process screen rendering", () => {
    test("does not render the URL input form while crawling", async () => {
        const { getByRole, queryByRole } = renderWithMockProvider(<Search />, [
            HOSTNAME_MOCK,
        ]);
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        await waitFor(() =>
            expect(queryByRole("textbox", { name: URL_INPUT_LABEL })).toBeNull()
        );
        expect(queryByRole("button", { name: SEARCH_BUTTON_TEXT })).toBeNull();
    });

    test("renders loading message while initiating crawl", async () => {
        const { getByRole, getByText } = renderWithMockProvider(<Search />, [
            HOSTNAME_MOCK,
        ]);
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        await waitFor(() => {
            expect(getByText(CRAWLING_MESSAGE)).toBeInTheDocument();
        });
    });
});

test("calls crawl service to initiate call given a valid URL and removes crawl message", async () => {
    const { getByRole, queryByText } = renderWithMockProvider(
        <MemoryRouter>
            <Search />
        </MemoryRouter>,
        [HOSTNAME_MOCK]
    );
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

    await waitFor(() => expect(HOSTNAME_MOCK.result).toHaveBeenCalled());
    await waitFor(() => {
        expect(queryByText(CRAWLING_MESSAGE)).not.toBeInTheDocument();
    });
});

test("does not call crawl service to initiate crawl given an invalid URL", async () => {
    const { getByRole } = renderWithMockProvider(<Search />);

    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: INVALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
    await waitFor(() => {
        expect(getByRole("alert")).toHaveTextContent(
            "Please enter a valid URL"
        );
    });

    expect(HOSTNAME_MOCK.result).toHaveBeenCalledTimes(0);
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
