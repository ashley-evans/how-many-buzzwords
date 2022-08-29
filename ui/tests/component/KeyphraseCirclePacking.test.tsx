import React from "react";
import { test, expect } from "@playwright/experimental-ct-react";

import KeyphraseCirclePacking from "../../src/components/KeyphraseCirclePacking";
import ResultConstants from "../../src/enums/Constants";
import { UniqueOccurrenceKey } from "../../src/types/UniqueOccurrenceKey";

const VALID_URL = new URL("https://www.example.com/");

function createOcurrenceKey(
    keyphrase: string,
    pathname: string = ResultConstants.TOTAL
): UniqueOccurrenceKey {
    return `${pathname}#${keyphrase}`;
}

test("should display a single keyphrase total occurrence and corresponding path total", async ({
    mount,
}) => {
    const expectedKeyphrase = "dyson";
    const expectedTotal = {
        [createOcurrenceKey(expectedKeyphrase)]: 11,
        [createOcurrenceKey(expectedKeyphrase, "/")]: 11,
    };

    const component = await mount(
        <KeyphraseCirclePacking occurrences={expectedTotal} url={VALID_URL} />
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
        [createOcurrenceKey(firstExpectedKeyphrase, "/")]: 11,
        [createOcurrenceKey(secondExpectedKeyphrase)]: 9,
        [createOcurrenceKey(secondExpectedKeyphrase, "/")]: 9,
    };

    const component = await mount(
        <KeyphraseCirclePacking occurrences={totals} url={VALID_URL} />
    );

    await expect(component).toContainText(firstExpectedKeyphrase);
    await expect(component).toContainText(secondExpectedKeyphrase);
});

test("should only show keyphrase totals by default", async ({ mount }) => {
    const pathname = "/test";
    const keyphrase = "test";
    const occurrences = {
        [createOcurrenceKey(keyphrase)]: 11,
        [createOcurrenceKey(keyphrase, pathname)]: 11,
    };

    const component = await mount(
        <KeyphraseCirclePacking occurrences={occurrences} url={VALID_URL} />
    );

    await expect(component).not.toContainText(pathname);
});

test("should display a circle packing with keyphrase sized proportionally to totals given multiple totals", async ({
    mount,
}) => {
    const expectedLargeKeyphrase = "dyson";
    const expectedSmallKeyphrase = "sphere";
    const totals = {
        [createOcurrenceKey(expectedLargeKeyphrase)]: 11,
        [createOcurrenceKey(expectedLargeKeyphrase, "/")]: 11,
        [createOcurrenceKey(expectedSmallKeyphrase)]: 9,
        [createOcurrenceKey(expectedSmallKeyphrase, "/")]: 9,
    };

    const component = await mount(
        <KeyphraseCirclePacking occurrences={totals} url={VALID_URL} />
    );

    await expect(component).toHaveScreenshot();
});

test("should drill down into path breakdown if total keyphrase pressed given pathname occurrences related to total", async ({
    mount,
    page,
}) => {
    const expectedKeyphrase = "dyson";
    const expectedFirstPathname = "/test";
    const expectedSecondPathname = "/wibble";
    const occurrences = {
        [createOcurrenceKey(expectedKeyphrase)]: 11,
        [createOcurrenceKey(expectedKeyphrase, expectedFirstPathname)]: 8,
        [createOcurrenceKey(expectedKeyphrase, expectedSecondPathname)]: 3,
    };

    const component = await mount(
        <KeyphraseCirclePacking occurrences={occurrences} url={VALID_URL} />
    );
    await page.locator(`text=${expectedKeyphrase}`).first().click();

    await expect(component).toContainText(expectedFirstPathname);
    await expect(component).toContainText(expectedSecondPathname);
});
