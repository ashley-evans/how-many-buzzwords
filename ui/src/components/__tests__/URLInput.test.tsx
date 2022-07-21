import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { mockFn } from "jest-mock-extended";

import { URLInput, URLInputProps } from "../URLInput";

const URL_INPUT_LABEL = "URL";
const SEARCH_BUTTON_TEXT = "Search!";

const VALID_URL = "http://www.example.com/";
const mockSubmitHandler = mockFn<URLInputProps["onURLSubmit"]>();

beforeEach(() => {
    mockSubmitHandler.mockClear();
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
        async (message: string, input: string, expectedError: string) => {
            const { getByRole, getByLabelText } = render(
                <URLInput onURLSubmit={mockSubmitHandler} />
            );
            fireEvent.input(getByLabelText(URL_INPUT_LABEL), {
                target: { value: input },
            });
            fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

            await waitFor(() => {
                expect(getByRole("alert")).toHaveTextContent(expectedError);
            });
        }
    );
});

describe("happy path", () => {
    test.each([
        ["a protocol", VALID_URL, new URL(VALID_URL)],
        ["no protocol", "www.example.com", new URL("https://www.example.com/")],
    ])(
        "calls the provided submit handler given a valid URL with %s",
        async (message: string, input: string, expectedResult: URL) => {
            const { getByRole, getByLabelText, queryByRole } = render(
                <URLInput onURLSubmit={mockSubmitHandler} />
            );
            fireEvent.input(getByLabelText(URL_INPUT_LABEL), {
                target: { value: input },
            });
            fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

            await waitFor(() =>
                expect(mockSubmitHandler).toHaveBeenCalledTimes(1)
            );
            expect(mockSubmitHandler).toHaveBeenCalledWith(expectedResult);
            expect(queryByRole("alert")).not.toBeInTheDocument();
        }
    );

    test("clears error message after changing input text", async () => {
        const { getByRole, queryByRole, getByLabelText } = render(
            <URLInput onURLSubmit={mockSubmitHandler} />
        );
        fireEvent.input(getByLabelText(URL_INPUT_LABEL), {
            target: { value: "" },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));
        fireEvent.input(getByLabelText(URL_INPUT_LABEL), {
            target: { value: VALID_URL },
        });
        fireEvent.submit(getByRole("button", { name: SEARCH_BUTTON_TEXT }));

        await waitFor(() =>
            expect(queryByRole("alert")).not.toBeInTheDocument()
        );
        await waitFor(() => expect(mockSubmitHandler).toHaveBeenCalled());
    });
});
