import React from "react";
import { render } from "@testing-library/react";

import OccurrenceTable from "../OccurrenceTable";

describe("given no occurrences", () => {
    test("renders awaiting results message", () => {
        const expectedText = "Awaiting results...";

        const { getByText } = render(<OccurrenceTable occurrences={[]} />);

        expect(getByText(expectedText)).toBeInTheDocument();
    });
});
