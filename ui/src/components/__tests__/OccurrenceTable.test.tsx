import React from "react";
import { render, within } from "@testing-library/react";

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

    test("does not render a table to contain the results", () => {
        const { queryByRole } = render(
            <OccurrenceTable baseURL={VALID_URL} occurrences={[]} />
        );

        expect(queryByRole("grid")).not.toBeInTheDocument();
    });
});

describe.each([
    [
        "a single occurrence",
        [
            {
                pathname: "/test",
                keyphrase: "wibble",
                occurrences: 5,
            },
        ],
    ],
    [
        "multiple occurrences",
        [
            {
                pathname: "/test",
                keyphrase: "wibble",
                occurrences: 5,
            },
            {
                pathname: "/example",
                keyphrase: "wobble",
                occurrences: 16,
            },
        ],
    ],
])(
    "given %s",
    (message: string, expectedOccurrences: PathnameOccurrences[]) => {
        test("renders expected header for results", () => {
            const expectedHeader = `Results for: ${VALID_URL.toString()}`;

            const { getByRole } = render(
                <OccurrenceTable
                    baseURL={VALID_URL}
                    occurrences={expectedOccurrences}
                />
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

        test("renders a table to contain the results", () => {
            const { getByRole } = render(
                <OccurrenceTable
                    baseURL={VALID_URL}
                    occurrences={expectedOccurrences}
                />
            );

            expect(getByRole("grid")).toBeInTheDocument();
        });

        test("renders required columns to contain results from crawl within table", () => {
            const expectedColumns = ["Pathname", "Keyphrase", "Occurrences"];

            const { getByRole } = render(
                <OccurrenceTable
                    baseURL={VALID_URL}
                    occurrences={expectedOccurrences}
                />
            );
            const table = getByRole("grid");

            for (const expectedColumn of expectedColumns) {
                expect(
                    within(table).getByRole("columnheader", {
                        name: expectedColumn,
                    })
                ).toBeInTheDocument();
            }
        });

        test("renders all pathname occurrence details within table contents", () => {
            const { getByRole } = render(
                <OccurrenceTable
                    baseURL={VALID_URL}
                    occurrences={expectedOccurrences}
                />
            );
            const table = getByRole("grid");

            for (const expectedOccurrence of expectedOccurrences) {
                expect(
                    within(table).getByRole("cell", {
                        name: expectedOccurrence.pathname,
                    })
                ).toBeInTheDocument();
                expect(
                    within(table).getByRole("cell", {
                        name: expectedOccurrence.keyphrase,
                    })
                ).toBeInTheDocument();
                expect(
                    within(table).getByRole("cell", {
                        name: expectedOccurrence.occurrences.toString(),
                    })
                ).toBeInTheDocument();
            }
        });
    }
);
