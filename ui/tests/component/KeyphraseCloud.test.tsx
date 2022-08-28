import React from "react";
import { test, expect } from "@playwright/experimental-ct-react";

import KeyphraseCloud from "../../src/components/KeyphraseCloud";

test("should display a single keyphrase occurrence", async ({ mount }) => {
    const expectedKeyphrase = "test";

    const component = await mount(
        <KeyphraseCloud occurrences={{ [expectedKeyphrase]: 15 }} />
    );

    await expect(component).toContainText(expectedKeyphrase);
});

test("should display multiple keyphrase occurrences", async ({ mount }) => {
    const expectedKeyphrases = ["test", "wibble"];
    const occurrences = {
        [expectedKeyphrases[0]]: 15,
        [expectedKeyphrases[1]]: 12,
    };

    const component = await mount(<KeyphraseCloud occurrences={occurrences} />);

    await expect(component).toContainText(expectedKeyphrases[0]);
    await expect(component).toContainText(expectedKeyphrases[1]);
});

test("should size keyphrases based on number of occurrences given keyphrases with different number of occurrences", async ({
    mount,
    page,
}) => {
    const expectedLargeKeyphrase = "wibble";
    const expectedSmallKeyphrase = "test";
    const occurrences = {
        [expectedLargeKeyphrase]: 15,
        [expectedSmallKeyphrase]: 12,
    };

    await mount(<KeyphraseCloud occurrences={occurrences} />);
    const actualSmallCloudElement = await page
        .locator(`text=${expectedSmallKeyphrase}`)
        .boundingBox();
    const actualLargeCloudElement = await page
        .locator(`text=${expectedLargeKeyphrase}`)
        .boundingBox();

    expect(actualSmallCloudElement).toBeDefined();
    expect(actualLargeCloudElement).toBeDefined();
    if (actualSmallCloudElement && actualLargeCloudElement) {
        expect(
            actualSmallCloudElement.width * actualSmallCloudElement.height
        ).toBeLessThan(
            actualLargeCloudElement.width * actualLargeCloudElement.height
        );
    }
});
