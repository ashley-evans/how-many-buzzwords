import React from "react";
import { render } from "@testing-library/react";

jest.mock("@ant-design/plots", () => ({
    __esModule: true,
    CirclePacking: () => {
        return <></>;
    },
}));

import KeyphraseCirclePacking from "../KeyphraseCirclePacking";
import ResultConstants from "../../enums/Constants";
import { UniqueOccurrenceKey } from "../../types/UniqueOccurrenceKey";

const VALID_URL = new URL("http://www.example.com/");

const EXPECTED_AWAITING_MESSAGE = "Awaiting results...";

describe.each([
    ["no occurrences", {}],
    ["a non total row occurrence", { "/test#wibble": 12 }],
    [
        "a total row occurrence without no path occurrence breakdown",
        { [`${ResultConstants.TOTAL}#test`]: 15 },
    ],
    [
        "a total row occurrence without a corresponding path occurrence breakdown",
        { [`${ResultConstants.TOTAL}#test`]: 15, "/test#wibble": 12 },
    ],
])(
    "given %s",
    (message: string, occurrences: Record<UniqueOccurrenceKey, number>) => {
        test("renders awaiting results message", () => {
            const { getByText } = render(
                <KeyphraseCirclePacking
                    occurrences={occurrences}
                    url={VALID_URL}
                />
            );

            expect(getByText(EXPECTED_AWAITING_MESSAGE)).toBeInTheDocument();
        });

        test("does not render the circle packing figure", () => {
            const { queryByRole } = render(
                <KeyphraseCirclePacking
                    occurrences={occurrences}
                    url={VALID_URL}
                />
            );

            expect(queryByRole("figure")).not.toBeInTheDocument();
        });
    }
);

describe("given a total row occurrence with corresponding path occurrence breakdown", () => {
    const total: Record<UniqueOccurrenceKey, number> = {
        [`${ResultConstants.TOTAL}#test`]: 15,
        "/test#test": 15,
    };

    test("does not render the awaiting results message", () => {
        const { queryByText } = render(
            <KeyphraseCirclePacking occurrences={total} url={VALID_URL} />
        );

        expect(queryByText(EXPECTED_AWAITING_MESSAGE)).not.toBeInTheDocument();
    });

    test("renders the tree map figure", () => {
        const { getByRole } = render(
            <KeyphraseCirclePacking occurrences={total} url={VALID_URL} />
        );

        expect(getByRole("figure")).toBeInTheDocument();
    });
});
