import React from "react";
import { test, expect } from "@playwright/experimental-ct-react";

import KeyphraseCloud from "../../src/components/KeyphraseCloud";
import { PathnameOccurrences } from "../../src/clients/interfaces/KeyphraseServiceClient";

test("should display a single keyphrase occurrence", async ({ mount }) => {
    const expectedOccurrence: PathnameOccurrences = {
        keyphrase: "test",
        pathname: "/wibble",
        occurrences: 15,
    };

    const component = await mount(
        <KeyphraseCloud occurrences={[expectedOccurrence]} />
    );

    await expect(component).toContainText(expectedOccurrence.keyphrase);
});

test("should display multiple keyphrase occurrences", async ({ mount }) => {
    const expectedOccurrence: PathnameOccurrences[] = [
        {
            keyphrase: "test",
            pathname: "/wibble",
            occurrences: 15,
        },
        {
            keyphrase: "wibble",
            pathname: "/test",
            occurrences: 10,
        },
    ];

    const component = await mount(
        <KeyphraseCloud occurrences={expectedOccurrence} />
    );

    await expect(component).toContainText(expectedOccurrence[0].keyphrase);
    await expect(component).toContainText(expectedOccurrence[1].keyphrase);
});

test("should only display unique keyphrase occurrences", async ({
    mount,
    page,
}) => {
    const expectedKeyphrase = "test";
    const expectedOccurrence: PathnameOccurrences[] = [
        {
            keyphrase: expectedKeyphrase,
            pathname: "/wibble",
            occurrences: 15,
        },
        {
            keyphrase: expectedKeyphrase,
            pathname: "/test",
            occurrences: 10,
        },
    ];

    await mount(<KeyphraseCloud occurrences={expectedOccurrence} />);
    const count = await page.locator(`text=${expectedKeyphrase}`).count();

    expect(count).toEqual(1);
});

test("should size keyphrases based on number of occurrences given keyphrases from a single path", async ({
    mount,
    page,
}) => {
    const expectedSmallKeyphrase = "test";
    const expectedLargeKeyphrase = "wibble";
    const expectedOccurrence: PathnameOccurrences[] = [
        {
            keyphrase: expectedLargeKeyphrase,
            pathname: "/test",
            occurrences: 15,
        },
        {
            keyphrase: expectedSmallKeyphrase,
            pathname: "/test",
            occurrences: 10,
        },
    ];

    await mount(<KeyphraseCloud occurrences={expectedOccurrence} />);
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

test("should size keyphrases based on number of occurrences given keyphrases from multiple paths", async ({
    mount,
    page,
}) => {
    const expectedSmallKeyphrase = "test";
    const expectedLargeKeyphrase = "wibble";
    const expectedOccurrence: PathnameOccurrences[] = [
        {
            keyphrase: expectedSmallKeyphrase,
            pathname: "/test",
            occurrences: 15,
        },
        {
            keyphrase: expectedLargeKeyphrase,
            pathname: "/test",
            occurrences: 10,
        },
        {
            keyphrase: expectedLargeKeyphrase,
            pathname: "/wibble",
            occurrences: 15,
        },
    ];

    await mount(<KeyphraseCloud occurrences={expectedOccurrence} />);
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
