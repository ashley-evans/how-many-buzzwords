import React from "react";
import {
    fireEvent,
    render,
    waitForElementToBeRemoved,
} from "@testing-library/react";
import nock from "nock";

import App from "../App";

const SERVICE_ENDPOINT = new URL("https://www.example.com/");
const APPLICATION_TITLE = "How many buzzwords";
const URL_INPUT_LABEL = "URL:";
const SEARCH_BUTTON_TEXT = "Search!";
const CRAWLING_MESSAGE = "Crawling...";

const VALID_URL = "http://www.example.com/";

describe("field rendering", () => {
    test("displays the title of the site in a header", () => {
        const { getByRole } = render(
            <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
        );

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

    test("displays a URL textbox with an appropriate label", () => {
        const { getByRole } = render(
            <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
        );

        expect(
            getByRole("textbox", { name: URL_INPUT_LABEL })
        ).toBeInTheDocument();
    });

    test("displays a search button", () => {
        const { getByRole } = render(
            <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
        );

        expect(
            getByRole("button", { name: SEARCH_BUTTON_TEXT })
        ).toBeInTheDocument();
    });
});

describe("input validation", () => {
    test.each([
        ["empty input", "", "Please enter a URL."],
        ["a numeric value", "123", "Please enter a valid URL"],
        ["invalid URL (space)", "test invalid.com", "Please enter a valid URL"],
    ])(
        "provides error message given %s",
        (message: string, input: string, expectedError: string) => {
            const { getByRole } = render(
                <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
            );
            fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
                target: { value: input },
            });
            fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

            expect(getByRole("alert")).toHaveTextContent(expectedError);
        }
    );

    test.each([
        ["with a protocol", VALID_URL],
        ["with no protocol", "www.example.com"],
    ])(
        "does not provide an error message given a valid URL %s",
        (message: string, input: string) => {
            const { getByRole, queryByRole } = render(
                <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
            );
            fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
                target: { value: input },
            });
            fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

            expect(queryByRole("alert")).toBeNull();
        }
    );

    test("clears error message after changing input text", () => {
        const { getByRole, queryByRole } = render(
            <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: "" },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });

        expect(queryByRole("alert")).toBeNull();
    });
});

describe("process screen rendering", () => {
    test("renders the title of the site while crawling", () => {
        const { getByRole } = render(
            <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

    test("does not render the URL input form while crawling", () => {
        const { getByRole, queryByRole } = render(
            <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        expect(queryByRole("textbox", { name: URL_INPUT_LABEL })).toBeNull();
        expect(queryByRole("button", { name: SEARCH_BUTTON_TEXT })).toBeNull();
    });

    test("renders loading message while crawling", () => {
        const { getByRole, getByText } = render(
            <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        expect(getByText(CRAWLING_MESSAGE)).toBeInTheDocument();
    });
});

test("initiates crawl when valid URL is entered", async () => {
    const scope = nock(SERVICE_ENDPOINT.toString(), {
        reqheaders: {
            "Content-Type": "application/json",
        },
    })
        .post("/crawl", {
            MessageBody: { url: VALID_URL },
        })
        .reply(200, "", { "Access-Control-Allow-Origin": "*" });

    const { getByRole, getByText } = render(
        <App crawlServiceEndpoint={SERVICE_ENDPOINT} />
    );
    fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
        target: { value: VALID_URL },
    });
    fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
    await waitForElementToBeRemoved(getByText(CRAWLING_MESSAGE));

    expect(scope.isDone()).toBe(true);
    nock.cleanAll();
});
