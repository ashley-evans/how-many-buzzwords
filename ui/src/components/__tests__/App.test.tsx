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

    test.each([
        ["empty input", "", "Please enter a URL."],
        ["a numeric value", "123", "Please enter a valid URL"],
        ["invalid URL (space)", "test invalid.com", "Please enter a valid URL"],
    ])(
        "provides error message given %s",
        (message: string, input: string, expectedError: string) => {
            const { getByRole } = render(<App />);
            fireEvent.input(getByRole("textbox", { name: URLInputBoxLabel }), {
                target: { value: input },
            });
            fireEvent.submit(getByRole("button", { name: searchButtonText }));

            expect(getByRole("alert")).toHaveTextContent(expectedError);
        }
    );

    test.each([
        ["with a protocol", "https://www.example.com/"],
        ["with no protocol", "www.example.com"],
    ])(
        "does not provide an error message given a valid URL %s",
        (message: string, input: string) => {
            const { getByRole, queryByRole } = render(<App />);
            fireEvent.input(getByRole("textbox", { name: URLInputBoxLabel }), {
                target: { value: input },
            });
            fireEvent.submit(getByRole("button", { name: searchButtonText }));

            expect(queryByRole("alert")).toBeNull();
        }
    );
});
