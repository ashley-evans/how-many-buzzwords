import React from "react";
import { render } from "@testing-library/react";
import { mock } from "jest-mock-extended";

import Search from "../Search";
import CrawlServiceClient from "../../clients/interfaces/CrawlServiceClient";

const mockCrawlClient = mock<CrawlServiceClient>();

const APPLICATION_TITLE = "How many buzzwords";
const URL_INPUT_LABEL = "URL:";
const SEARCH_BUTTON_TEXT = "Search!";

describe("field rendering", () => {
    test("displays the title of the site in a header", () => {
        const { getByRole } = render(
            <Search crawlServiceClient={mockCrawlClient} />
        );

        expect(
            getByRole("heading", { name: APPLICATION_TITLE })
        ).toBeInTheDocument();
    });

    test("displays a URL textbox with an appropriate label", () => {
        const { getByRole } = render(
            <Search crawlServiceClient={mockCrawlClient} />
        );

        expect(
            getByRole("textbox", { name: URL_INPUT_LABEL })
        ).toBeInTheDocument();
    });

    test("displays a search button", () => {
        const { getByRole } = render(
            <Search crawlServiceClient={mockCrawlClient} />
        );

        expect(
            getByRole("button", { name: SEARCH_BUTTON_TEXT })
        ).toBeInTheDocument();
    });
});
