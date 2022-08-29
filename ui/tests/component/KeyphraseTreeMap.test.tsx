import React from "react";
import { test, expect } from "@playwright/experimental-ct-react";

import KeyphraseTreeMap from "../../src/components/KeyphraseTreeMap";
import { PathnameOccurrences } from "../../src/clients/interfaces/KeyphraseServiceClient";
import ResultConstants from "../../src/enums/Constants";

const totals: PathnameOccurrences[] = [
    {
        pathname: ResultConstants.TOTAL,
        keyphrase: "dyson",
        occurrences: 11,
    },
    { pathname: ResultConstants.TOTAL, keyphrase: "sphere", occurrences: 9 },
];

test("should display a single keyphrase total occurrence", async ({
    mount,
}) => {
    const expectedTotal = totals[0];

    const component = await mount(
        <KeyphraseTreeMap occurrences={[expectedTotal]} />
    );

    await expect(component).toContainText(expectedTotal.keyphrase);
});

test("should display multiple keyphrase total occurrences", async ({
    mount,
}) => {
    const component = await mount(<KeyphraseTreeMap occurrences={totals} />);

    for (const total of totals) {
        await expect(component).toContainText(total.keyphrase);
    }
});
