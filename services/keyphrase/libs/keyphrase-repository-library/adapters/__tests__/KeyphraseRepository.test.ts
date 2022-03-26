/**
 * @group integration
 */

process.env.AWS_ACCESS_KEY_ID = "x";
process.env.AWS_SECRET_ACCESS_KEY = "x";
process.env.AWS_REGION = "eu-west-2";

import dynamoose from "dynamoose";

import { KeyphraseOccurrences } from "../../ports/Repository";
import KeyphraseRepository from "../KeyphraseRepository";

dynamoose.aws.ddb.local("http://localhost:8000");

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

const repository = new KeyphraseRepository(TABLE_NAME, true);

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

describe.each([
    ["no keyphrase occurrences", []],
    ["one keyphrase occurrence", [TEST_KEYPHRASES[0]]],
    ["multiple keyphrase occurrences", TEST_KEYPHRASES],
])(
    "GET ALL: given %s stored for URL",
    (message: string, occurrences: KeyphraseOccurrences[]) => {
        beforeAll(async () => {
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                occurrences
            );
        });

        test("get returns each keyphrase occurrence", async () => {
            const response = await repository.getKeyphrases(VALID_URL.hostname);

            expect(response).toHaveLength(occurrences.length);
            for (const occurrence of occurrences) {
                expect(response).toContainEqual({
                    pathname: VALID_URL.pathname,
                    keyphrase: occurrence.keyphrase,
                    occurrences: occurrence.occurrences,
                });
            }
        });

        afterAll(async () => {
            await repository.deleteKeyphrases(VALID_URL.hostname);
        });
    }
);

describe("GET ALL: given keyphrases occurrences stored against multiple paths on base URL", () => {
    const OTHER_PATHNAME = `${VALID_URL.pathname}1`;

    beforeAll(async () => {
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
    });

    test("get returns all keyphrases related to a given base URL", async () => {
        const response = await repository.getKeyphrases(VALID_URL.hostname);

        expect(response).toHaveLength(2);
        expect(response).toContainEqual({
            pathname: VALID_URL.pathname,
            keyphrase: TEST_KEYPHRASES[0].keyphrase,
            occurrences: TEST_KEYPHRASES[0].occurrences,
        });
        expect(response).toContainEqual({
            pathname: OTHER_PATHNAME,
            keyphrase: TEST_KEYPHRASES[1].keyphrase,
            occurrences: TEST_KEYPHRASES[1].occurrences,
        });
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL.hostname);
    });
});

describe("GET ALL: given keyphrase occurrences stored for multiple URLs", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[0];

    beforeAll(async () => {
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
    });

    test("get returns only keyphrases related to provided URL", async () => {
        const response = await repository.getKeyphrases(VALID_URL.hostname);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual({
            pathname: VALID_URL.pathname,
            keyphrase: expectedKeyphrase.keyphrase,
            occurrences: expectedKeyphrase.occurrences,
        });
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL.hostname);
        await repository.deleteKeyphrases(OTHER_URL.hostname);
    });
});

describe.each([
    ["no keyphrase occurrences", []],
    ["one keyphrase occurrence", [TEST_KEYPHRASES[0]]],
    ["multiple keyphrase occurrences", TEST_KEYPHRASES],
])(
    "GET PATH: given %s stored for URL on a specific path",
    (message: string, occurrences: KeyphraseOccurrences[]) => {
        beforeAll(async () => {
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                occurrences
            );
        });

        test("get returns each keyphrase occurrence", async () => {
            const response = await repository.getPathKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname
            );

            expect(response).toHaveLength(occurrences.length);
            for (const occurrence of occurrences) {
                expect(response).toContainEqual({
                    keyphrase: occurrence.keyphrase,
                    occurrences: occurrence.occurrences,
                });
            }
        });

        afterAll(async () => {
            await repository.deleteKeyphrases(VALID_URL.hostname);
        });
    }
);

describe("GET PATH: given keyphrase occurrences stored for multiple paths on same URL", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[0];

    beforeAll(async () => {
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expectedKeyphrase
        );
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            `${VALID_URL.pathname}1`,
            TEST_KEYPHRASES[1]
        );
    });

    test("get returns only keyphrases related to provided path", async () => {
        const response = await repository.getPathKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname
        );

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual({
            keyphrase: expectedKeyphrase.keyphrase,
            occurrences: expectedKeyphrase.occurrences,
        });
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL.hostname);
    });
});

describe("GET PATH: given keyphrase occurrences stored for same path on multiple URLs", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[0];
    const path = "/duplicate";

    beforeAll(async () => {
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            path,
            expectedKeyphrase
        );
        await repository.storeKeyphrases(
            OTHER_URL.hostname,
            path,
            TEST_KEYPHRASES[1]
        );
    });

    test("get returns only keyphrases related to provided URL and path", async () => {
        const response = await repository.getPathKeyphrases(
            VALID_URL.hostname,
            path
        );

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual({
            keyphrase: expectedKeyphrase.keyphrase,
            occurrences: expectedKeyphrase.occurrences,
        });
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL.hostname);
        await repository.deleteKeyphrases(OTHER_URL.hostname);
    });
});

describe.each([
    ["no totals", []],
    ["one total", [TEST_KEYPHRASES[0]]],
    ["multiple totals", TEST_KEYPHRASES],
])(
    "GET TOTAL: given %s stored",
    (message: string, totals: KeyphraseOccurrences[]) => {
        beforeAll(async () => {
            await repository.storeTotals(totals);
        });

        test("get returns stored totals", async () => {
            const response = await repository.getTotals();

            expect(response).toHaveLength(totals.length);
            expect(response).toEqual(expect.arrayContaining(totals));
        });

        afterAll(async () => {
            await repository.deleteTotals();
        });
    }
);

describe("GET TOTAL: Only returns totals related to provided base URL", () => {
    const expectedTotal = TEST_KEYPHRASES[0];

    beforeAll(async () => {
        await repository.storeTotals(expectedTotal, VALID_URL.hostname);
        await repository.storeTotals(TEST_KEYPHRASES[1], OTHER_URL.hostname);
    });

    test("get returns only totals associated with provied base URL", async () => {
        const response = await repository.getTotals(VALID_URL.hostname);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(expectedTotal);
    });

    afterAll(async () => {
        await repository.deleteTotals(VALID_URL.hostname);
        await repository.deleteTotals(OTHER_URL.hostname);
    });
});

describe.each([
    ["no pages", []],
    ["one page", [VALID_URL.hostname]],
    ["multiple pages", [VALID_URL.hostname, OTHER_URL.hostname]],
])(
    "GET USAGES: given keyphrase used on %s",
    (message: string, pages: string[]) => {
        const expectedKeyphrase = TEST_KEYPHRASES[0];

        beforeAll(async () => {
            for (const page of pages) {
                await repository.storeTotals(expectedKeyphrase, page);
            }
        });

        test("get returns all pages keyphrase is used on", async () => {
            const response = await repository.getKeyphraseUsages(
                expectedKeyphrase.keyphrase
            );

            expect(response).toHaveLength(pages.length);
            expect(response).toEqual(pages);
        });

        afterAll(async () => {
            for (const page of pages) {
                await repository.deleteTotals(page);
            }
        });
    }
);

describe("GET USAGE: Only returns usages related to provided keyphrase", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[0];
    const expectedPage = VALID_URL.hostname;

    beforeAll(async () => {
        await repository.storeTotals(expectedKeyphrase, expectedPage);
        await repository.storeTotals(TEST_KEYPHRASES[1], OTHER_URL.hostname);
    });

    test("get returns only totals associated with provied base URL", async () => {
        const response = await repository.getKeyphraseUsages(
            expectedKeyphrase.keyphrase
        );

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(expectedPage);
    });

    afterAll(async () => {
        await repository.deleteTotals(expectedPage);
        await repository.deleteTotals(OTHER_URL.hostname);
    });
});

describe("PUT: Stores new keyphrase occurrence", () => {
    let response: boolean;

    beforeAll(async () => {
        response = await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
    });

    test("stores the keyphrase occurrence successfully", async () => {
        const result = await repository.getKeyphrases(VALID_URL.hostname);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            pathname: VALID_URL.pathname,
            keyphrase: TEST_KEYPHRASES[0].keyphrase,
            occurrences: TEST_KEYPHRASES[0].occurrences,
        });
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL.hostname);
    });
});

describe("PUT: Overwrites existing keyphrase occurrence", () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );

        response = await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
    });

    test("does not add duplicate keyphrase occurrences", async () => {
        const result = await repository.getKeyphrases(VALID_URL.hostname);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            pathname: VALID_URL.pathname,
            keyphrase: TEST_KEYPHRASES[0].keyphrase,
            occurrences: TEST_KEYPHRASES[0].occurrences,
        });
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL.hostname);
    });
});

describe.each([
    ["less than 25", createRandomOccurrences(24)],
    ["greater than 25", createRandomOccurrences(26)],
])(
    "PUT: Stores all keyphrase occurrences given %s items",
    (message: string, expectedOccurrences: KeyphraseOccurrences[]) => {
        let response: boolean;

        beforeAll(async () => {
            response = await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                expectedOccurrences
            );
        });

        test("stores all provided keyphrases occurrences successfully", async () => {
            const results = await repository.getKeyphrases(VALID_URL.hostname);

            expect(results).toHaveLength(expectedOccurrences.length);
            for (const occurrence of expectedOccurrences) {
                expect(results).toContainEqual({
                    pathname: VALID_URL.pathname,
                    keyphrase: occurrence.keyphrase,
                    occurrences: occurrence.occurrences,
                });
            }
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });

        afterAll(async () => {
            await repository.deleteKeyphrases(VALID_URL.hostname);
        });
    }
);

describe("PUT: Overwrites existing keyphrase occurrences given multiple stored simultaneously", () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
        response = await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES
        );
    });

    test("does not add duplicate keyphrase occurrences", async () => {
        const results = await repository.getKeyphrases(VALID_URL.hostname);

        expect(results).toHaveLength(TEST_KEYPHRASES.length);
        for (const occurrence of TEST_KEYPHRASES) {
            expect(results).toContainEqual({
                pathname: VALID_URL.pathname,
                keyphrase: occurrence.keyphrase,
                occurrences: occurrence.occurrences,
            });
        }
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL.hostname);
    });
});

describe.each([
    ["global keyphrase total", undefined],
    ["keyphrase total for given base URL", VALID_URL.hostname],
])("PUT TOTAL: Stores new %s", (message: string, baseURL?: string) => {
    let response: boolean;

    beforeAll(async () => {
        response = await repository.storeTotals(TEST_KEYPHRASES[0], baseURL);
    });

    test("stores total entry successfully", async () => {
        const results = await repository.getTotals(baseURL);

        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({
            keyphrase: TEST_KEYPHRASES[0].keyphrase,
            occurrences: TEST_KEYPHRASES[0].occurrences,
        });
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteTotals();
    });
});

describe.each([
    ["global keyphrase total", undefined],
    ["keyphrase total for given base URL", VALID_URL.hostname],
])("PUT TOTAL: Overwrites existing %s", (message: string, baseURL?: string) => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storeTotals(TEST_KEYPHRASES[0], baseURL);
        response = await repository.storeTotals(TEST_KEYPHRASES[0], baseURL);
    });

    test("does not add duplicate total entries", async () => {
        const results = await repository.getTotals(baseURL);

        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({
            keyphrase: TEST_KEYPHRASES[0].keyphrase,
            occurrences: TEST_KEYPHRASES[0].occurrences,
        });
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteTotals(baseURL);
    });
});

describe.each([
    ["less than 25 global totals", createRandomOccurrences(24)],
    ["greater than 25 global totals", createRandomOccurrences(26)],
    [
        "less than 25 keyphrase total for given base URL",
        createRandomOccurrences(24),
        VALID_URL.hostname,
    ],
    [
        "greater than 25 keyphrase total for given base URL",
        createRandomOccurrences(26),
        VALID_URL.hostname,
    ],
])(
    "PUT TOTAL: Stores all totals given %s",
    (message: string, totals: KeyphraseOccurrences[], baseURL?: string) => {
        let response: boolean;

        beforeAll(async () => {
            response = await repository.storeTotals(totals, baseURL);
        });

        test("stores all provided totals successfully", async () => {
            const results = await repository.getTotals(baseURL);

            expect(results).toHaveLength(totals.length);
            for (const total of totals) {
                expect(results).toContainEqual({
                    keyphrase: total.keyphrase,
                    occurrences: total.occurrences,
                });
            }
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });

        afterAll(async () => {
            await repository.deleteTotals(baseURL);
        });
    }
);

describe.each([
    ["global keyphrase total", undefined],
    ["keyphrase total for given base URL", VALID_URL.hostname],
])(
    "PUT TOTAL: Overwrites %s provided multiple stored simultaneously",
    (message: string, baseURL?: string) => {
        let response: boolean;

        beforeAll(async () => {
            await repository.storeTotals(TEST_KEYPHRASES[0], baseURL);
            response = await repository.storeTotals(TEST_KEYPHRASES, baseURL);
        });

        test("does not add duplicate totals", async () => {
            const results = await repository.getTotals(baseURL);

            expect(results).toHaveLength(TEST_KEYPHRASES.length);
            for (const occurrence of TEST_KEYPHRASES) {
                expect(results).toContainEqual({
                    keyphrase: occurrence.keyphrase,
                    occurrences: occurrence.occurrences,
                });
            }
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });

        afterAll(async () => {
            await repository.deleteTotals(baseURL);
        });
    }
);

describe.each([
    ["one occurrence", [TEST_KEYPHRASES[0]]],
    ["less than 25 occurrences", createRandomOccurrences(24)],
    ["greater than 25 occurrences", createRandomOccurrences(26)],
])(
    "DELETE: given %s stored for URL",
    (message: string, occurrences: KeyphraseOccurrences[]) => {
        let response: boolean;

        beforeAll(async () => {
            await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                occurrences
            );

            response = await repository.deleteKeyphrases(VALID_URL.hostname);
        });

        test("returns no pathnames following deletion", async () => {
            const result = await repository.getKeyphrases(VALID_URL.hostname);

            expect(result).toHaveLength(0);
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });
    }
);

describe("DELETE: given keyphrases occurrences stored against multiple paths on base URL", () => {
    const OTHER_PATHNAME = `${VALID_URL.pathname}1`;

    let response: boolean;

    beforeAll(async () => {
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

        response = await repository.deleteKeyphrases(VALID_URL.hostname);
    });

    test("returns no pathnames following deletion", async () => {
        const result = await repository.getKeyphrases(VALID_URL.hostname);

        expect(result).toHaveLength(0);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });
});

test("DELETE: returns failure given no keyphrase occurrences stored", async () => {
    const response = await repository.deleteKeyphrases(VALID_URL.hostname);

    expect(response).toEqual(false);
});

describe("DELETE: only effects associated keyphrase occurrences", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[1];

    let response: boolean;

    beforeAll(async () => {
        await repository.storeKeyphrases(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
        await repository.storeKeyphrases(
            OTHER_URL.hostname,
            OTHER_URL.pathname,
            expectedKeyphrase
        );

        response = await repository.deleteKeyphrases(VALID_URL.hostname);
    });

    test("returns no keyphrase occurrences for affected URL", async () => {
        const result = await repository.getKeyphrases(VALID_URL.hostname);

        expect(result).toHaveLength(0);
    });

    test("returns keyphrase occurrences for non-affected URL", async () => {
        const result = await repository.getKeyphrases(OTHER_URL.hostname);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            pathname: OTHER_URL.pathname,
            keyphrase: expectedKeyphrase.keyphrase,
            occurrences: expectedKeyphrase.occurrences,
        });
    });

    test("deletion returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(OTHER_URL.hostname);
    });
});

describe.each([
    ["one global keyphrase total", [TEST_KEYPHRASES[0]]],
    ["less than 25 global keyphrase totals", createRandomOccurrences(24)],
    ["greater than 25 global keyphrase totals", createRandomOccurrences(26)],
    [
        "one total for provided base URL",
        [TEST_KEYPHRASES[0]],
        VALID_URL.hostname,
    ],
    [
        "less than 25 keyphrase totals for provided base URL",
        createRandomOccurrences(24),
        VALID_URL.hostname,
    ],
    [
        "greater than 25 keyphrase totals for provided base URL",
        createRandomOccurrences(26),
        VALID_URL.hostname,
    ],
])(
    "DELETE TOTAL: given %s stored",
    (message: string, totals: KeyphraseOccurrences[], baseURL?: string) => {
        let response: boolean;

        beforeAll(async () => {
            await repository.storeTotals(totals, baseURL);
            response = await repository.deleteTotals(baseURL);
        });

        test("returns no pathnames following deletion", async () => {
            const result = await repository.getTotals(baseURL);

            expect(result).toHaveLength(0);
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });
    }
);

test.each([
    ["global keyphrase totals", undefined],
    ["keyphrase totals for provided base URL", VALID_URL.hostname],
])(
    "DELETE TOTAL: returns failure given no %s stored",
    async (message: string, baseURL?: string) => {
        const response = await repository.deleteTotals(baseURL);

        expect(response).toEqual(false);
    }
);
