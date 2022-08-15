import React from "react";
import { render } from "@testing-library/react";

import KeyphraseCloud from "../KeyphraseCloud";

const EXPECTED_AWAITING_MESSAGE = "Awaiting results...";

describe("given no occurrences", () => {
    test("renders awaiting results message", () => {
        const { getByText } = render(<KeyphraseCloud />);

        expect(getByText(EXPECTED_AWAITING_MESSAGE)).toBeInTheDocument();
    });
});
