import React from "react";
import { render } from "@testing-library/react";

jest.mock("@ant-design/plots", () => ({
    __esModule: true,
    Treemap: () => {
        return <></>;
    },
}));

import KeyphraseTreeMap from "../KeyphraseTreeMap";
import { PathnameOccurrences } from "../../clients/interfaces/KeyphraseServiceClient";
import ResultConstants from "../../enums/Constants";

const EXPECTED_AWAITING_MESSAGE = "Awaiting results...";

describe.each([
    ["no occurrences", []],
    [
        "a not total row occurrence",
        [{ pathname: "/test", keyphrase: "wibble", occurrences: 12 }],
    ],
])("given %s", (message: string, occurrences: PathnameOccurrences[]) => {
    test("renders awaiting results message", () => {
        const { getByText } = render(
            <KeyphraseTreeMap occurrences={occurrences} />
        );

        expect(getByText(EXPECTED_AWAITING_MESSAGE)).toBeInTheDocument();
    });

    test("does not render the tree map figure", () => {
        const { queryByRole } = render(
            <KeyphraseTreeMap occurrences={occurrences} />
        );

        expect(queryByRole("figure")).not.toBeInTheDocument();
    });
});

describe("given a total row occurrence", () => {
    const total: PathnameOccurrences = {
        pathname: ResultConstants.TOTAL,
        keyphrase: "test",
        occurrences: 15,
    };

    test("does not render the awaiting results message", () => {
        const { queryByText } = render(
            <KeyphraseTreeMap occurrences={[total]} />
        );

        expect(queryByText(EXPECTED_AWAITING_MESSAGE)).not.toBeInTheDocument();
    });

    test("renders the tree map figure", () => {
        const { getByRole } = render(
            <KeyphraseTreeMap occurrences={[total]} />
        );

        expect(getByRole("figure")).toBeInTheDocument();
    });
});
