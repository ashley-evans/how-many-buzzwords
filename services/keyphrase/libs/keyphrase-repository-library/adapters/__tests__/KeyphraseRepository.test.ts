/**
 * @group integration
 */

process.env.AWS_ACCESS_KEY_ID = "x";
process.env.AWS_SECRET_ACCESS_KEY = "x";
process.env.AWS_REGION = "eu-west-2";

import dynamoose from "dynamoose";

import { KeyphraseOccurrences } from "../../ports/Repository";
import KeyphraseRepository from "../KeyphraseRepository";

const dynamoDB = new dynamoose.aws.ddb.DynamoDB({
    endpoint: "http://localhost:8000",
});
dynamoose.aws.ddb.set(dynamoDB);

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
    const expectedTotal = TEST_KEYPHRASES[0];

    beforeAll(async () => {
        await repository.addTotals(VALID_URL.hostname, expectedTotal);
        await repository.addTotals(OTHER_URL.hostname, TEST_KEYPHRASES[1]);
    });

    test("get returns only totals associated with provied base URL", async () => {
        const response = await repository.getTotals(VALID_URL.hostname);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(expectedTotal);
    });

    afterAll(async () => {
        await repository.empty();
    });
});

describe.each([
    ["no sites", []],
    ["one site", [VALID_URL.hostname]],
    ["multiple sites", [VALID_URL.hostname, OTHER_URL.hostname]],
])(
    "GET USAGES: given keyphrase used on %s",
    (message: string, sites: string[]) => {
        const expectedKeyphrase = TEST_KEYPHRASES[0];

        beforeAll(async () => {
            for (const site of sites) {
                await repository.addTotals(site, expectedKeyphrase);
            }
        });

        test("get returns all sites keyphrase is used on", async () => {
            const response = await repository.getKeyphraseUsages(
                expectedKeyphrase.keyphrase
            );

            expect(response).toHaveLength(sites.length);
            expect(response).toEqual(sites);
        });

        afterAll(async () => {
            await repository.empty();
        });
    }
);

describe("GET USAGE: Only returns usages related to provided keyphrase", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[0];
    const expectedSite = VALID_URL.hostname;

    beforeAll(async () => {
        await repository.addTotals(expectedSite, expectedKeyphrase);
        await repository.addTotals(OTHER_URL.hostname, TEST_KEYPHRASES[1]);
    });

    test("get returns only totals associated with provided base URL", async () => {
        const response = await repository.getKeyphraseUsages(
            expectedKeyphrase.keyphrase
        );

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(expectedSite);
    });

    afterAll(async () => {
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

            const stored = await repository.getKeyphrases(
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

        const stored = await repository.getKeyphrases(
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

        const stored = await repository.getKeyphrases(
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
        const stored = await repository.getKeyphrases(VALID_URL.hostname);

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

        const response = await repository.getKeyphrases(VALID_URL.hostname);

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

        const response = await repository.getKeyphrases(VALID_URL.hostname);

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

                const stored = await repository.getKeyphrases(
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
            const stored = await repository.getKeyphrases(VALID_URL.hostname);

            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual({
                pathname: VALID_URL.pathname,
                keyphrase: newValue.keyphrase,
                occurrences: newValue.occurrences,
                aggregated: false,
            });
        });

        test("overwrites existing values with new values given multiple keyphrases", async () => {
            const newValues = TEST_KEYPHRASES.map((keyphrase) => {
                keyphrase.occurrences *= 2;
                return keyphrase;
            });
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
            const stored = await repository.getKeyphrases(VALID_URL.hostname);

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
        ["a single total", TEST_KEYPHRASES[0], [TEST_KEYPHRASES[0]]],
        ["less than 25 totals", TEST_KEYPHRASES, TEST_KEYPHRASES],
        [
            "greater than 25 totals",
            TEST_BATCH_KEYPHRASES,
            TEST_BATCH_KEYPHRASES,
        ],
    ])(
        "new total storage given %s",
        (
            message: string,
            input: KeyphraseOccurrences | KeyphraseOccurrences[],
            expected: KeyphraseOccurrences[]
        ) => {
            test("returns success when total storage succeeds", async () => {
                const actual = await repository.addTotals(
                    VALID_URL.hostname,
                    input
                );

                expect(actual).toBe(true);
            });

            test("stores site totals successfully", async () => {
                await repository.addTotals(VALID_URL.hostname, input);

                const stored = await repository.getTotals(VALID_URL.hostname);

                expect(stored).toEqual(expect.arrayContaining(expected));
            });

            test("stores global total successfully", async () => {
                await repository.addTotals(VALID_URL.hostname, input);

                const stored = await repository.getTotals();

                expect(stored).toEqual(expect.arrayContaining(expected));
            });
        }
    );

    test.each([
        ["a single total", TEST_KEYPHRASES[0]],
        ["multiple totals", TEST_KEYPHRASES],
    ])(
        "returns success when total storage succeeds given %s that have been stored before",
        async (
            message: string,
            totals: KeyphraseOccurrences | KeyphraseOccurrences[]
        ) => {
            await repository.addTotals(VALID_URL.hostname, totals);

            const actual = await repository.addTotals(
                VALID_URL.hostname,
                totals
            );

            expect(actual).toBe(true);
        }
    );

    describe("existing total storage", () => {
        test("increments site total given existing site total", async () => {
            await repository.addTotals(VALID_URL.hostname, TEST_KEYPHRASES[0]);

            await repository.addTotals(VALID_URL.hostname, TEST_KEYPHRASES[0]);
            const stored = await repository.getTotals(VALID_URL.hostname);

            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual({
                keyphrase: TEST_KEYPHRASES[0].keyphrase,
                occurrences: TEST_KEYPHRASES[0].occurrences * 2,
            });
        });

        test("increments site totals given existing site totals", async () => {
            await repository.addTotals(VALID_URL.hostname, TEST_KEYPHRASES);

            await repository.addTotals(VALID_URL.hostname, TEST_KEYPHRASES);
            const stored = await repository.getTotals(VALID_URL.hostname);

            expect(stored).toHaveLength(2);
            expect(stored[0]).toEqual({
                keyphrase: TEST_KEYPHRASES[0].keyphrase,
                occurrences: TEST_KEYPHRASES[0].occurrences * 2,
            });
            expect(stored[1]).toEqual({
                keyphrase: TEST_KEYPHRASES[1].keyphrase,
                occurrences: TEST_KEYPHRASES[1].occurrences * 2,
            });
        });

        test("increments existing global keyphrase total given a new occurrence on a different base URL", async () => {
            await repository.addTotals(VALID_URL.hostname, TEST_KEYPHRASES[0]);

            await repository.addTotals(OTHER_URL.hostname, TEST_KEYPHRASES[0]);
            const stored = await repository.getTotals();

            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual({
                keyphrase: TEST_KEYPHRASES[0].keyphrase,
                occurrences: TEST_KEYPHRASES[0].occurrences * 2,
            });
        });

        test("increments existing global keyphrase totals given new occurrences on a different base URL", async () => {
            await repository.addTotals(VALID_URL.hostname, TEST_KEYPHRASES);

            await repository.addTotals(OTHER_URL.hostname, TEST_KEYPHRASES);
            const stored = await repository.getTotals();

            expect(stored).toHaveLength(2);
            expect(stored[0]).toEqual({
                keyphrase: TEST_KEYPHRASES[0].keyphrase,
                occurrences: TEST_KEYPHRASES[0].occurrences * 2,
            });
            expect(stored[1]).toEqual({
                keyphrase: TEST_KEYPHRASES[1].keyphrase,
                occurrences: TEST_KEYPHRASES[1].occurrences * 2,
            });
        });
    });

    test("returns failure when storage fails given a single total", async () => {
        const putItemSpy = jest.spyOn(dynamoDB, "transactWriteItems");
        putItemSpy.mockImplementation(() => {
            throw new Error("test error");
        });

        const actual = await repository.addTotals(
            VALID_URL.hostname,
            TEST_KEYPHRASES[0]
        );
        putItemSpy.mockRestore();

        expect(actual).toBe(false);
    });

    test("returns failure when storage fails given multiple totals", async () => {
        const putItemSpy = jest.spyOn(dynamoDB, "transactWriteItems");
        putItemSpy.mockImplementation(() => {
            throw new Error("test error");
        });

        const actual = await repository.addTotals(
            VALID_URL.hostname,
            TEST_KEYPHRASES
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
                const actual = await repository.getKeyphrases(
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
                await repository.addTotals(VALID_URL.hostname, occurrences);
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
