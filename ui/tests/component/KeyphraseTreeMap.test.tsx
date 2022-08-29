import React from "react";
import { test, expect } from "@playwright/experimental-ct-react";

import KeyphraseTreeMap from "../../src/components/KeyphraseTreeMap";
import ResultConstants from "../../src/enums/Constants";
import { UniqueOccurrenceKey } from "../../src/types/UniqueOccurrenceKey";

function createOcurrenceKey(
    keyphrase: string,
    pathname: string = ResultConstants.TOTAL
): UniqueOccurrenceKey {
    return `${pathname}#${keyphrase}`;
}

test("should display a single keyphrase total occurrence", async ({
    mount,
}) => {
    const expectedKeyphrase = "dyson";
    const expectedTotal = { [createOcurrenceKey(expectedKeyphrase)]: 11 };

    const component = await mount(
        <KeyphraseTreeMap occurrences={expectedTotal} />
    );

    await expect(component).toContainText(expectedKeyphrase);
});

test("should display multiple keyphrase total occurrences", async ({
    mount,
}) => {
    const firstExpectedKeyphrase = "dyson";
    const secondExpectedKeyphrase = "sphere";
    const totals = {
        [createOcurrenceKey(firstExpectedKeyphrase)]: 11,
        [createOcurrenceKey(secondExpectedKeyphrase)]: 9,
    };

    const component = await mount(<KeyphraseTreeMap occurrences={totals} />);

    await expect(component).toContainText(firstExpectedKeyphrase);
    await expect(component).toContainText(secondExpectedKeyphrase);
});

test("should display a treemap with keyphrase sized proportionally to totals given multiple totals", async ({
    mount,
}) => {
    const expectedLargeKeyphrase = "dyson";
    const expectedSmallKeyphrase = "sphere";
    const totals = {
        [createOcurrenceKey(expectedLargeKeyphrase)]: 11,
        [createOcurrenceKey(expectedSmallKeyphrase)]: 9,
    };

    const component = await mount(<KeyphraseTreeMap occurrences={totals} />);

    await expect(component).toHaveScreenshot();
});
