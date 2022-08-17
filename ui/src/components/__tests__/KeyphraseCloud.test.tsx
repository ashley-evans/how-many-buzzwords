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

    test("does not render a word cloud figure", () => {
        const { queryByRole } = render(<KeyphraseCloud occurrences={[]} />);

        expect(queryByRole("figure")).not.toBeInTheDocument();
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

    test("renders the word cloud figure", () => {
        const { getByRole, getByText } = render(
            <KeyphraseCloud occurrences={occurrences} />
        );

        expect(getByRole("figure")).toBeInTheDocument();

        const test = getByText("wibble");

        console.dir(test);
    });
});

// TODO: Visual differences does not work as the chart is different every time the application is run
// By converting to SVG, we can use getByText to get the rendered text in the graph
// We can then check the size of the containing box, ensuring that the containers are larger
// Past that, I have no idea what to be able test
