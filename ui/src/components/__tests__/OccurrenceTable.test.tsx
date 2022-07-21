import React from "react";
import { render, within } from "@testing-library/react";

import OccurrenceTable from "../OccurrenceTable";
import { PathnameOccurrences } from "../../clients/interfaces/KeyphraseServiceClient";

const AWAITING_RESULTS_MESSAGE = "Awaiting results...";

describe("given no occurrences", () => {
    test("renders awaiting results message", () => {
        const { getByText } = render(<OccurrenceTable occurrences={[]} />);

        expect(getByText(AWAITING_RESULTS_MESSAGE)).toBeInTheDocument();
    });

    test("does not render a table to contain the results", () => {
        const { queryByRole } = render(<OccurrenceTable occurrences={[]} />);

        expect(queryByRole("table")).not.toBeInTheDocument();
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
        test("does not render the awaiting results message", () => {
            const { queryByText } = render(
                <OccurrenceTable occurrences={expectedOccurrences} />
            );

            expect(
                queryByText(AWAITING_RESULTS_MESSAGE)
            ).not.toBeInTheDocument();
        });

        test("renders a table to contain the results", () => {
            const { getByRole } = render(
                <OccurrenceTable occurrences={expectedOccurrences} />
            );

            expect(getByRole("table")).toBeInTheDocument();
        });

        test("renders required columns to contain results from crawl within table", () => {
            const expectedColumns = ["Pathname", "Keyphrase", "Occurrences"];

            const { getByRole } = render(
                <OccurrenceTable occurrences={expectedOccurrences} />
            );
            const table = getByRole("table");

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
                <OccurrenceTable occurrences={expectedOccurrences} />
            );
            const table = getByRole("table");

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
