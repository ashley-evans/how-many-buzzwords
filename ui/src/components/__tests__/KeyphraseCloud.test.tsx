import React from "react";
import { render } from "@testing-library/react";

import KeyphraseCloud from "../KeyphraseCloud";
import { PathnameOccurrences } from "../../clients/interfaces/KeyphraseServiceClient";

const EXPECTED_AWAITING_MESSAGE = "Awaiting results...";

describe("given no occurrences", () => {
    test("renders awaiting results message", () => {
        const { getByText } = render(<KeyphraseCloud occurrences={[]} />);

        expect(getByText(EXPECTED_AWAITING_MESSAGE)).toBeInTheDocument();
    });
});

describe("given a single occurrence", () => {
    const occurrences: PathnameOccurrences[] = [
        {
            pathname: "/test",
            keyphrase: "wibble",
            occurrences: 10,
        },
    ];

    test("does not render the awaiting results message", () => {
        const { queryByText } = render(
            <KeyphraseCloud occurrences={occurrences} />
        );

        expect(queryByText(EXPECTED_AWAITING_MESSAGE)).not.toBeInTheDocument();
    });
});
