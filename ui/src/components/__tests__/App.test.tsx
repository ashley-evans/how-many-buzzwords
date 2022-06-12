import React from "react";
import { fireEvent, render } from "@testing-library/react";

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
