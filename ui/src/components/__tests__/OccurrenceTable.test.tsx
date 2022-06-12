import React from "react";
import { render } from "@testing-library/react";

import OccurrenceTable from "../OccurrenceTable";
import { PathnameOccurrences } from "../../clients/interfaces/KeyphraseServiceClient";

const VALID_URL = new URL("https://www.example.com/");

describe("given no occurrences", () => {
    test("renders expected header for results", () => {
        const expectedHeader = `Results for: ${VALID_URL.toString()}`;

        const { getByRole } = render(
            <OccurrenceTable baseURL={VALID_URL} occurrences={[]} />
        );

        expect(
            getByRole("heading", { name: expectedHeader })
        ).toBeInTheDocument();
    });

    test("renders awaiting results message", () => {
        const expectedText = "Awaiting results...";

        const { getByText } = render(
            <OccurrenceTable baseURL={VALID_URL} occurrences={[]} />
        );

        expect(getByText(expectedText)).toBeInTheDocument();
    });
});

describe("given a single occurrence", () => {
    const expectedOccurrences: PathnameOccurrences[] = [
        {
            pathname: "/test",
            keyphrase: "wibble",
            occurrences: 5,
        },
    ];

    test("renders expected header for results", () => {
        const expectedHeader = `Results for: ${VALID_URL.toString()}`;

        const { getByRole } = render(
            <OccurrenceTable baseURL={VALID_URL} occurrences={[]} />
        );

        expect(
            getByRole("heading", { name: expectedHeader })
        ).toBeInTheDocument();
    });

    test("does not render the awaiting results message", () => {
        const expectedText = "Awaiting results...";

        const { queryByText } = render(
            <OccurrenceTable
                baseURL={VALID_URL}
                occurrences={expectedOccurrences}
            />
        );

        expect(queryByText(expectedText)).not.toBeInTheDocument();
    });
});
