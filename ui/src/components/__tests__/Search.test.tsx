import React from "react";
import {
    fireEvent,
    waitFor,
    waitForElementToBeRemoved,
} from "@testing-library/react";
import { GraphQLError } from "graphql";

import { renderWithMockProvider } from "./helpers/utils";
import { Search, START_CRAWL_MUTATION } from "../Search";

const APPLICATION_TITLE = "How many buzzwords";
const URL_INPUT_LABEL = "URL:";
const SEARCH_BUTTON_TEXT = "Search!";
const CRAWLING_MESSAGE = "Initiating crawl...";

const VALID_URL = new URL("http://www.example.com/");
const INVALID_URL = "not a valid URL";

beforeEach(() => {
    jest.resetAllMocks();
});

const HOSTNAME_MOCK = {
    request: {
        query: START_CRAWL_MUTATION,
        variables: { url: VALID_URL.hostname },
    },
    result: jest.fn(() => ({
        data: {
            startCrawl: { started: true },
        },
    })),
};

describe("field rendering", () => {
    test("displays the title of the site in a header", () => {
        const { getByRole } = renderWithMockProvider(<Search />);

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

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
    test("renders the title of the site while crawling", async () => {
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

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

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

test("calls crawl service to initiate call given a valid URL", async () => {
    const { getByRole, queryByText } = renderWithMockProvider(<Search />, [
        HOSTNAME_MOCK,
    ]);
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
    await waitForElementToBeRemoved(() => queryByText(CRAWLING_MESSAGE));

    expect(HOSTNAME_MOCK.result).toHaveBeenCalled();
});

test("does not call crawl service to initiate crawl given an invalid URL", () => {
    const { getByRole } = renderWithMockProvider(<Search />);
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: INVALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

    expect(HOSTNAME_MOCK.result).toHaveBeenCalledTimes(0);
});

test("removes loading message after crawl completes", async () => {
    const { getByRole, queryByText } = renderWithMockProvider(<Search />);
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

    await waitFor(() => {
        expect(queryByText(CRAWLING_MESSAGE)).not.toBeInTheDocument();
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
