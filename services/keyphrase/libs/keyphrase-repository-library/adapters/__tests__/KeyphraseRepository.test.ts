/**
 * @group integration
 */

process.env.AWS_ACCESS_KEY_ID = "x";
process.env.AWS_SECRET_ACCESS_KEY = "x";
process.env.AWS_REGION = "eu-west-2";

import dynamoose from "dynamoose";

import {
    KeyphraseOccurrences,
    SiteKeyphrase,
    SiteKeyphraseOccurrences,
} from "../../ports/Repository";
import KeyphraseRepository from "../KeyphraseRepository";

const dynamoDB = new dynamoose.aws.ddb.DynamoDB({
    endpoint: "http://localhost:8000",
});
dynamoose.aws.ddb.set(dynamoDB);

function createSiteOccurrence(
    url: URL,
    keyphraseOccurrence: KeyphraseOccurrences
): SiteKeyphraseOccurrences {
    return {
        baseURL: url.hostname,
        pathname: url.pathname,
        keyphrase: keyphraseOccurrence.keyphrase,
        occurrences: keyphraseOccurrence.occurrences,
    };
}

function createKeyphraseOccurrence(
    keyphrase: string,
    occurrences: number
): KeyphraseOccurrences {
    return {
        keyphrase,
        occurrences,
    };
}

function createRandomOccurrences(
    numberToCreate: number
): KeyphraseOccurrences[] {
    const result: KeyphraseOccurrences[] = [];
    for (let i = 1; i <= numberToCreate; i++) {
        const occurrence = createKeyphraseOccurrence(`test-${i}`, i);
        result.push(occurrence);
    }

    return result;
}

function createOccurrenceItem(
    url: URL,
    keyphraseOccurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
): SiteKeyphraseOccurrences | SiteKeyphraseOccurrences[] {
    if (Array.isArray(keyphraseOccurrences)) {
        return keyphraseOccurrences.map((occurrence) =>
            createSiteOccurrence(url, occurrence)
        );
    }

    return createSiteOccurrence(url, keyphraseOccurrences);
}

function createSiteKeyphrase(url: URL, keyphrase: string): SiteKeyphrase {
    return {
        baseURL: url.hostname,
        pathname: url.pathname,
        keyphrase,
    };
}

function extractKeyphraseKeys(
    url: URL,
    keyphraseOccurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
): SiteKeyphrase | SiteKeyphrase[] {
    if (Array.isArray(keyphraseOccurrences)) {
        return keyphraseOccurrences.map((occurrence) =>
            createSiteKeyphrase(url, occurrence.keyphrase)
        );
    }

    return createSiteKeyphrase(url, keyphraseOccurrences.keyphrase);
}

const TABLE_NAME = "keyphrase-table";
const VALID_URL = new URL("http://www.example.com/example");
const OTHER_URL = new URL("http://www.test.com/test");

const TEST_KEYPHRASES = [
    createKeyphraseOccurrence("test", 5),
    createKeyphraseOccurrence("wibble", 3),
];
const TEST_BATCH_KEYPHRASES = createRandomOccurrences(26);

const repository = new KeyphraseRepository(TABLE_NAME, true);

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET TOTAL: Only returns totals related to provided base URL", () => {
    const expectedKeyphrase = createKeyphraseOccurrence("sphere", 3);

    beforeAll(async () => {
        const otherKeyphrase = createKeyphraseOccurrence("dyson", 2);
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expectedKeyphrase
        );
        await repository.storeKeyphrases(
            OTHER_URL.hostname,
            OTHER_URL.pathname,
            otherKeyphrase
        );
        await repository.addOccurrencesToTotals(
            createSiteOccurrence(VALID_URL, expectedKeyphrase)
        );
        await repository.addOccurrencesToTotals(
            createSiteOccurrence(OTHER_URL, otherKeyphrase)
        );
    });

    test("get returns only totals associated with provied base URL", async () => {
        const response = await repository.getTotals(VALID_URL.hostname);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual({
            keyphrase: expectedKeyphrase.keyphrase,
            occurrences: expectedKeyphrase.occurrences,
        });
    });

    afterAll(async () => {
        await repository.empty();
    });
});

describe.each([
    ["no sites", []],
    ["one site", [VALID_URL]],
    ["multiple sites", [VALID_URL, OTHER_URL]],
])(
    "GET USAGES: given keyphrase used on %s",
    (message: string, sites: URL[]) => {
        const expectedKeyphrase = TEST_KEYPHRASES[0];

        beforeAll(async () => {
            for (const site of sites) {
                const total = createSiteOccurrence(site, expectedKeyphrase);
                await repository.storeKeyphrases(
                    site.hostname,
                    site.pathname,
                    expectedKeyphrase
                );
                await repository.addOccurrencesToTotals(total);
            }
        });

        test("get returns all sites keyphrase is used on", async () => {
            const response = await repository.getKeyphraseUsages(
                expectedKeyphrase.keyphrase
            );

            expect(response).toHaveLength(sites.length);
            expect(response).toEqual(sites.map((site) => site.hostname));
        });

        afterAll(async () => {
            await repository.empty();
        });
    }
);

describe("GET USAGE: Only returns usages related to provided keyphrase", () => {
    const expectedKeyphrase = "sphere";

    beforeAll(async () => {
        const expected = createKeyphraseOccurrence(expectedKeyphrase, 2);
        const unexpected = createKeyphraseOccurrence("unexpected", 4);
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expected
        );
        await repository.addOccurrencesToTotals(
            createSiteOccurrence(
                VALID_URL,
                createKeyphraseOccurrence(expectedKeyphrase, 2)
            )
        );
        await repository.storeKeyphrases(
            OTHER_URL.hostname,
            OTHER_URL.pathname,
            unexpected
        );
        await repository.addOccurrencesToTotals(
            createSiteOccurrence(OTHER_URL, unexpected)
        );
    });

    test("get returns only totals associated with provided base URL", async () => {
        const response = await repository.getKeyphraseUsages(expectedKeyphrase);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(VALID_URL.hostname);
    });

    afterAll(async () => {
        await repository.empty();
    });
});

describe("individual keyphrase occurrence retrieval", () => {
    beforeEach(async () => {
        await repository.empty();
    });

    test("returns undefined if no occurrences stored for keyphrase", async () => {
        const actual = await repository.getOccurrences(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0].keyphrase
        );

        expect(actual).toBeUndefined();
    });

    test("returns occurrence if occurrences stored for provided keyphrase on site", async () => {
        const expected = TEST_KEYPHRASES[0];
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expected
        );

        const actual = await repository.getOccurrences(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expected.keyphrase
        );

        expect(actual).toEqual({ ...expected, aggregated: false });
    });

    afterEach(async () => {
        await repository.empty();
    });
});

describe("path keyphrase occurrence retrieval", () => {
    beforeEach(async () => {
        await repository.empty();
    });

    test.each([
        ["none stored for path", []],
        ["one occurrence stored for path", [TEST_KEYPHRASES[0]]],
        ["multiple occurrences stored for path", TEST_KEYPHRASES],
    ])(
        "returns stored occurrences for path given %s",
        async (message: string, input: KeyphraseOccurrences[]) => {
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                input
            );

            const stored = await repository.getOccurrences(
                VALID_URL.hostname,
                VALID_URL.pathname
            );

            const expected = input.map((occurrence) => {
                return { ...occurrence, aggregated: false };
            });
            expect(stored).toEqual(expected);
        }
    );

    test("only returns occurrences related to provided path given occurrences stored against multiple paths on site", async () => {
        const OTHER_PATHNAME = "/other";
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            OTHER_PATHNAME,
            TEST_KEYPHRASES[1]
        );

        const stored = await repository.getOccurrences(
            VALID_URL.hostname,
            VALID_URL.pathname
        );

        expect(stored).toHaveLength(1);
        expect(stored[0]).toEqual({ ...TEST_KEYPHRASES[0], aggregated: false });
    });

    test("only returns occurrences related to provided path and site given occurrences on same path on another site", async () => {
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
        await repository.storeKeyphrases(
            OTHER_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[1]
        );

        const stored = await repository.getOccurrences(
            VALID_URL.hostname,
            VALID_URL.pathname
        );

        expect(stored).toHaveLength(1);
        expect(stored[0]).toEqual({ ...TEST_KEYPHRASES[0], aggregated: false });
    });

    afterEach(async () => {
        await repository.empty();
    });
});

describe("site keyphrase occurrence retrieval", () => {
    beforeEach(async () => {
        await repository.empty();
    });

    test("returns no keyphrase occurrences given none stored for site", async () => {
        const stored = await repository.getOccurrences(VALID_URL.hostname);

        expect(stored).toHaveLength(0);
    });

    test("returns keyphrases related to provided site given keyphrases stored for multiple paths on site", async () => {
        const OTHER_PATHNAME = "/other";
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            OTHER_PATHNAME,
            TEST_KEYPHRASES[1]
        );

        const response = await repository.getOccurrences(VALID_URL.hostname);

        expect(response).toHaveLength(2);
        expect(response).toContainEqual({
            pathname: VALID_URL.pathname,
            keyphrase: TEST_KEYPHRASES[0].keyphrase,
            occurrences: TEST_KEYPHRASES[0].occurrences,
            aggregated: false,
        });
        expect(response).toContainEqual({
            pathname: OTHER_PATHNAME,
            keyphrase: TEST_KEYPHRASES[1].keyphrase,
            occurrences: TEST_KEYPHRASES[1].occurrences,
            aggregated: false,
        });
    });

    test("only returns occurrences related to provided site given occurrences stored for multiple sites", async () => {
        const expectedKeyphrase = TEST_KEYPHRASES[0];
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expectedKeyphrase
        );
        await repository.storeKeyphrases(
            OTHER_URL.hostname,
            OTHER_URL.pathname,
            TEST_KEYPHRASES[1]
        );

        const response = await repository.getOccurrences(VALID_URL.hostname);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual({
            pathname: VALID_URL.pathname,
            keyphrase: expectedKeyphrase.keyphrase,
            occurrences: expectedKeyphrase.occurrences,
            aggregated: false,
        });
    });

    afterEach(async () => {
        await repository.empty();
    });
});

describe("keyphrase occurrence storage", () => {
    beforeEach(async () => {
        await repository.empty();
    });

    describe.each([
        ["a single occurrence", TEST_KEYPHRASES[0], [TEST_KEYPHRASES[0]]],
        ["less than 25 occurrences", TEST_KEYPHRASES, TEST_KEYPHRASES],
        [
            "greater than 25 occurrences",
            TEST_BATCH_KEYPHRASES,
            TEST_BATCH_KEYPHRASES,
        ],
    ])(
        "new keyphrase occurrence storage given %s",
        (
            message: string,
            input: KeyphraseOccurrences | KeyphraseOccurrences[],
            expected: KeyphraseOccurrences[]
        ) => {
            test("returns success when occurrence storage succeeds", async () => {
                const actual = await repository.storeKeyphrases(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    input
                );

                expect(actual).toBe(true);
            });

            test("stores keyphrase occurrences successfully against provided path", async () => {
                await repository.storeKeyphrases(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    input
                );

                const stored = await repository.getOccurrences(
                    VALID_URL.hostname
                );

                expect(stored).toHaveLength(expected.length);
                for (const occurrence of expected) {
                    expect(stored).toContainEqual({
                        pathname: VALID_URL.pathname,
                        keyphrase: occurrence.keyphrase,
                        occurrences: occurrence.occurrences,
                        aggregated: false,
                    });
                }
            });
        }
    );

    describe("existing occurrence storage", () => {
        test("overwrites existing occurrence value with new value given a single keyphrase", async () => {
            const newValue: KeyphraseOccurrences = {
                keyphrase: TEST_KEYPHRASES[0].keyphrase,
                occurrences: TEST_KEYPHRASES[0].occurrences * 2,
            };
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                TEST_KEYPHRASES[0]
            );

            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                newValue
            );
            const stored = await repository.getOccurrences(VALID_URL.hostname);

            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual({
                pathname: VALID_URL.pathname,
                keyphrase: newValue.keyphrase,
                occurrences: newValue.occurrences,
                aggregated: false,
            });
        });

        test("overwrites existing values with new values given multiple keyphrases", async () => {
            const newValues: KeyphraseOccurrences[] = TEST_KEYPHRASES.map(
                (current) => ({
                    keyphrase: current.keyphrase,
                    occurrences: current.occurrences * 2,
                })
            );
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                TEST_KEYPHRASES[0]
            );

            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                newValues
            );
            const stored = await repository.getOccurrences(VALID_URL.hostname);

            expect(stored).toHaveLength(newValues.length);
            for (const occurrence of newValues) {
                expect(stored).toContainEqual({
                    pathname: VALID_URL.pathname,
                    keyphrase: occurrence.keyphrase,
                    occurrences: occurrence.occurrences,
                    aggregated: false,
                });
            }
        });
    });

    afterEach(async () => {
        await repository.empty();
    });
});

describe("total handling", () => {
    beforeEach(async () => {
        await repository.empty();
    });

    describe.each([
        ["a single item", TEST_KEYPHRASES[0], [TEST_KEYPHRASES[0]]],
        ["less than 25 items", TEST_KEYPHRASES, TEST_KEYPHRASES],
        ["greater than 25 items", TEST_BATCH_KEYPHRASES, TEST_BATCH_KEYPHRASES],
    ])(
        "new total storage given %s",
        (
            message: string,
            occurrences: KeyphraseOccurrences | KeyphraseOccurrences[],
            expected: KeyphraseOccurrences[]
        ) => {
            const items = createOccurrenceItem(VALID_URL, occurrences);

            beforeEach(async () => {
                await repository.storeKeyphrases(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    occurrences
                );
            });

            test("returns success when total storage succeeds", async () => {
                const actual = await repository.addOccurrencesToTotals(items);

                expect(actual).toBe(true);
            });

            test("stores site totals successfully", async () => {
                await repository.addOccurrencesToTotals(items);

                const stored = await repository.getTotals(VALID_URL.hostname);

                expect(stored).toEqual(expect.arrayContaining(expected));
            });

            test("stores global total successfully", async () => {
                await repository.addOccurrencesToTotals(items);

                const stored = await repository.getTotals();

                expect(stored).toEqual(expect.arrayContaining(expected));
            });
        }
    );

    test.each([
        ["a single item", TEST_KEYPHRASES[0]],
        ["multiple items", TEST_KEYPHRASES],
    ])(
        "returns success given %s that have been totalled before",
        async (
            message: string,
            occurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
        ) => {
            const items = createOccurrenceItem(VALID_URL, occurrences);
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                occurrences
            );
            await repository.addOccurrencesToTotals(items);

            const actual = await repository.addOccurrencesToTotals(items);

            expect(actual).toBe(true);
        }
    );

    describe("existing total storage", () => {
        test("does not increment site total given item has already been added to total", async () => {
            const item = createOccurrenceItem(VALID_URL, TEST_KEYPHRASES[0]);
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                TEST_KEYPHRASES[0]
            );
            await repository.addOccurrencesToTotals(item);

            await repository.addOccurrencesToTotals(item);
            const stored = await repository.getTotals(VALID_URL.hostname);

            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual({
                keyphrase: TEST_KEYPHRASES[0].keyphrase,
                occurrences: TEST_KEYPHRASES[0].occurrences,
            });
        });

        test("does not increment site totals given multiple items that have already been added to total", async () => {
            const items = createOccurrenceItem(VALID_URL, TEST_KEYPHRASES);
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                TEST_KEYPHRASES
            );
            await repository.addOccurrencesToTotals(items);

            await repository.addOccurrencesToTotals(items);
            const stored = await repository.getTotals(VALID_URL.hostname);

            expect(stored).toHaveLength(TEST_KEYPHRASES.length);
            for (const expected of TEST_KEYPHRASES) {
                expect(stored).toContainEqual({
                    keyphrase: expected.keyphrase,
                    occurrences: expected.occurrences,
                });
            }
        });

        test("increments existing global keyphrase total given a new occurrence on a different base URL", async () => {
            const commonKeyphrase = createKeyphraseOccurrence("test", 15);
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                commonKeyphrase
            );
            await repository.storeKeyphrases(
                OTHER_URL.hostname,
                OTHER_URL.pathname,
                commonKeyphrase
            );
            await repository.addOccurrencesToTotals(
                createSiteOccurrence(VALID_URL, commonKeyphrase)
            );

            await repository.addOccurrencesToTotals(
                createSiteOccurrence(OTHER_URL, commonKeyphrase)
            );
            const stored = await repository.getTotals();

            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual({
                keyphrase: commonKeyphrase.keyphrase,
                occurrences: commonKeyphrase.occurrences * 2,
            });
        });

        test("increments existing global keyphrase totals given new occurrences on a different base URL", async () => {
            const firstSiteOccurrences = TEST_KEYPHRASES.map((current) =>
                createSiteOccurrence(VALID_URL, current)
            );
            const secondSiteOccurrences = TEST_KEYPHRASES.map((current) =>
                createSiteOccurrence(OTHER_URL, current)
            );
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                firstSiteOccurrences
            );
            await repository.storeKeyphrases(
                OTHER_URL.hostname,
                OTHER_URL.pathname,
                secondSiteOccurrences
            );
            await repository.addOccurrencesToTotals(firstSiteOccurrences);

            await repository.addOccurrencesToTotals(secondSiteOccurrences);
            const stored = await repository.getTotals();

            expect(stored).toHaveLength(TEST_KEYPHRASES.length);
            for (const expected of TEST_KEYPHRASES) {
                expect(stored).toContainEqual({
                    keyphrase: expected.keyphrase,
                    occurrences: expected.occurrences * 2,
                });
            }
        });
    });

    test("returns failure when storage fails given a single total", async () => {
        const putItemSpy = jest.spyOn(dynamoDB, "transactWriteItems");
        putItemSpy.mockImplementation(() => {
            throw new Error("test error");
        });

        const actual = await repository.addOccurrencesToTotals(
            createOccurrenceItem(VALID_URL, TEST_KEYPHRASES[0])
        );
        putItemSpy.mockRestore();

        expect(actual).toBe(false);
    });

    test("returns failure when storage fails given multiple totals", async () => {
        const putItemSpy = jest.spyOn(dynamoDB, "transactWriteItems");
        putItemSpy.mockImplementation(() => {
            throw new Error("test error");
        });

        const actual = await repository.addOccurrencesToTotals(
            createOccurrenceItem(VALID_URL, TEST_KEYPHRASES)
        );
        putItemSpy.mockRestore();

        expect(actual).toBe(false);
    });

    test.each([
        ["global totals", undefined],
        ["site totals", VALID_URL.hostname],
    ])(
        "throws an error when an unexpected error occurs while retrieving %s",
        async (message: string, baseURL?: string) => {
            const expectedError = new Error("Test Error");
            const querySpy = jest.spyOn(dynamoDB, "query");
            querySpy.mockImplementation(() => {
                throw expectedError;
            });

            expect.assertions(1);
            await expect(repository.getTotals(baseURL)).rejects.toEqual(
                expectedError
            );
            querySpy.mockRestore();
        }
    );

    afterEach(async () => {
        await repository.empty();
    });
});

describe("setting keyphrase to aggregated", () => {
    beforeEach(async () => {
        await repository.empty();
    });

    describe.each([
        ["a single item", TEST_KEYPHRASES[0]],
        ["less than 25 items", TEST_KEYPHRASES],
        ["greater than 25 items", TEST_BATCH_KEYPHRASES],
    ])(
        "aggregated state update given %s",
        (
            message: string,
            occurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
        ) => {
            const siteKeyphrases = extractKeyphraseKeys(VALID_URL, occurrences);

            beforeEach(async () => {
                await repository.storeKeyphrases(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    occurrences
                );
            });

            test("returns success when update succeeds", async () => {
                const actual = await repository.setKeyphraseAggregated(
                    siteKeyphrases
                );

                expect(actual).toBe(true);
            });

            test("updates aggregated flag to true", async () => {
                await repository.setKeyphraseAggregated(siteKeyphrases);

                const actual = await repository.getOccurrences(
                    VALID_URL.hostname
                );

                for (const item of actual) {
                    expect(item.aggregated).toBe(true);
                }
            });
        }
    );

    test("returns success if item is already set to aggregated", async () => {
        const occurrence = TEST_KEYPHRASES[0];
        const keyphrase = extractKeyphraseKeys(VALID_URL, occurrence);
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            occurrence
        );
        await repository.setKeyphraseAggregated(keyphrase);

        const actual = await repository.setKeyphraseAggregated(keyphrase);

        expect(actual).toBe(true);
    });

    describe("updating non-existent keyphrase", () => {
        const keyphrase = extractKeyphraseKeys(
            VALID_URL,
            TEST_KEYPHRASES[0]
        ) as SiteKeyphrase;

        test("returns failure", async () => {
            const actual = await repository.setKeyphraseAggregated(keyphrase);

            expect(actual).toBe(false);
        });

        test("does not create a item for this keyphrase", async () => {
            await repository.setKeyphraseAggregated(keyphrase);

            const actual = await repository.getOccurrences(
                keyphrase.baseURL,
                keyphrase.pathname,
                keyphrase.keyphrase
            );

            expect(actual).toBeUndefined();
        });
    });

    afterEach(async () => {
        await repository.empty();
    });
});

describe("empty table behaviour", () => {
    describe.each([
        ["nothing", []],
        ["a single keyphrase occurrence", TEST_KEYPHRASES[0]],
        ["less than 25 occurrences", TEST_KEYPHRASES],
        ["more than 25 occurrences", TEST_BATCH_KEYPHRASES],
    ])(
        "Empty clears all keyphrase occurrences given %s stored",
        (
            message: string,
            occurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
        ) => {
            beforeEach(async () => {
                await repository.storeKeyphrases(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    occurrences
                );
            });

            test("returns success", async () => {
                const actual = await repository.empty();

                expect(actual).toBe(true);
            });

            test("empties table of occurrences", async () => {
                await repository.empty();
                const actual = await repository.getOccurrences(
                    VALID_URL.hostname
                );

                expect(actual).toHaveLength(0);
            });
        }
    );

    describe.each([
        ["a single total", TEST_KEYPHRASES[0]],
        ["less than 25 totals", TEST_KEYPHRASES],
        ["more than 25 totals", TEST_BATCH_KEYPHRASES],
    ])(
        "Empty clears all totals given %s stored",
        (
            message: string,
            occurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
        ) => {
            beforeEach(async () => {
                await repository.storeKeyphrases(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    occurrences
                );
                await repository.addOccurrencesToTotals(
                    createOccurrenceItem(VALID_URL, occurrences)
                );
            });

            test("returns success", async () => {
                const actual = await repository.empty();

                expect(actual).toBe(true);
            });

            test("empties table of site totals", async () => {
                await repository.empty();
                const actual = await repository.getTotals(VALID_URL.hostname);

                expect(actual).toHaveLength(0);
            });

            test("empties table of global totals", async () => {
                await repository.empty();
                const actual = await repository.getTotals();

                expect(actual).toHaveLength(0);
            });
        }
    );
});
