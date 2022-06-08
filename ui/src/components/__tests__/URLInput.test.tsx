import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { mockFn } from "jest-mock-extended";

import { URLInput, URLInputProps } from "../URLInput";

const URL_INPUT_LABEL = "URL:";
const SEARCH_BUTTON_TEXT = "Search!";

const VALID_URL = "http://www.example.com/";
const mockSubmitHandler = mockFn<URLInputProps["onURLSubmit"]>();

beforeEach(() => {
    jest.resetAllMocks();
});

describe("rendering", () => {
    test("displays a URL textbox with an appropriate label", () => {
        const { getByRole } = render(
            <URLInput onURLSubmit={mockSubmitHandler} />
        );

        expect(
            getByRole("textbox", { name: URL_INPUT_LABEL })
        ).toBeInTheDocument();
    });

    test("displays a search button", () => {
        const { getByRole } = render(
            <URLInput onURLSubmit={mockSubmitHandler} />
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
                <URLInput onURLSubmit={mockSubmitHandler} />
            );
            fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
                target: { value: input },
            });
            fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

            expect(getByRole("alert")).toHaveTextContent(expectedError);
        }
    );

    test.each([
        ["a protocol", VALID_URL],
        ["no protocol", "www.example.com"],
    ])(
        "does not provide an error message given a valid URL with %s",
        (message: string, input: string) => {
            const { getByRole, queryByRole } = render(
                <URLInput onURLSubmit={mockSubmitHandler} />
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
            <URLInput onURLSubmit={mockSubmitHandler} />
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

test.each([
    ["a protocol", VALID_URL, new URL(VALID_URL)],
    ["no protocol", "www.example.com", new URL("https://www.example.com/")],
])(
    "calls the provided submit handler given a valid URL with %s",
    (message: string, input: string, expectedResult: URL) => {
        const { getByRole } = render(
            <URLInput onURLSubmit={mockSubmitHandler} />
        );
        fireEvent.input(getByRole("textbox", { name: URL_INPUT_LABEL }), {
            target: { value: input },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        expect(mockSubmitHandler).toHaveBeenCalledTimes(1);
        expect(mockSubmitHandler).toHaveBeenCalledWith(expectedResult);
    }
);
