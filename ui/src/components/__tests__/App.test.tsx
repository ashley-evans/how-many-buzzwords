import React from "react";
import { fireEvent, render } from "@testing-library/react";

import App from "../App";

describe("field rendering", () => {
    test("displays the title of the site in a header", () => {
        const expectedTitle = "How many buzzwords";

        const { getByRole } = render(<App />);

        expect(
            getByRole("heading", { name: expectedTitle })
        ).toBeInTheDocument();
    });

    test("displays a URL textbox with an appropriate label", () => {
        const expectedLabel = "URL:";

        const { getByRole } = render(<App />);

        expect(
            getByRole("textbox", { name: expectedLabel })
        ).toBeInTheDocument();
    });

    test("displays a search button", () => {
        const expectedButtonText = "Search!";

        const { getByRole } = render(<App />);

        expect(
            getByRole("button", { name: expectedButtonText })
        ).toBeInTheDocument();
    });
});

describe("input validation", () => {
    const URLInputBoxLabel = "URL:";
    const searchButtonText = "Search!";

    test("rejects empty input", async () => {
        const expectedError = "Please enter a URL.";

        const { getByRole } = render(<App />);
        fireEvent.input(getByRole("textbox", { name: URLInputBoxLabel }), {
            target: { value: "" },
        });
        fireEvent.submit(getByRole("button", { name: searchButtonText }));

        expect(getByRole("alert")).toHaveTextContent(expectedError);
    });
});
