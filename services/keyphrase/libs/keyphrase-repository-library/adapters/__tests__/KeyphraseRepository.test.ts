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
            await repository.empty();
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
        await repository.empty();
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
        await repository.empty();
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
            await repository.empty();
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
        await repository.empty();
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
        await repository.empty();
    });
});

describe("GET TOTAL: Only returns totals related to provided base URL", () => {
    const expectedTotal = TEST_KEYPHRASES[0];

    beforeAll(async () => {
        await repository.storeTotals(VALID_URL.hostname, expectedTotal);
        await repository.storeTotals(OTHER_URL.hostname, TEST_KEYPHRASES[1]);
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
    ["no pages", []],
    ["one page", [VALID_URL.hostname]],
    ["multiple pages", [VALID_URL.hostname, OTHER_URL.hostname]],
])(
    "GET USAGES: given keyphrase used on %s",
    (message: string, pages: string[]) => {
        const expectedKeyphrase = TEST_KEYPHRASES[0];

        beforeAll(async () => {
            for (const page of pages) {
                await repository.storeTotals(page, expectedKeyphrase);
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
            await repository.empty();
        });
    }
);

describe("GET USAGE: Only returns usages related to provided keyphrase", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[0];
    const expectedPage = VALID_URL.hostname;

    beforeAll(async () => {
        await repository.storeTotals(expectedPage, expectedKeyphrase);
        await repository.storeTotals(OTHER_URL.hostname, TEST_KEYPHRASES[1]);
    });

    test("get returns only totals associated with provided base URL", async () => {
        const response = await repository.getKeyphraseUsages(
            expectedKeyphrase.keyphrase
        );

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(expectedPage);
    });

    afterAll(async () => {
        await repository.empty();
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
        await repository.empty();
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
        await repository.empty();
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
            await repository.empty();
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
                const actual = await repository.storeTotals(
                    VALID_URL.hostname,
                    input
                );

                expect(actual).toBe(true);
            });

            test("stores page totals successfully", async () => {
                await repository.storeTotals(VALID_URL.hostname, input);

                const stored = await repository.getTotals(VALID_URL.hostname);

                expect(stored).toEqual(expect.arrayContaining(expected));
            });

            test("stores global total successfully", async () => {
                await repository.storeTotals(VALID_URL.hostname, input);

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
            pageTotals: KeyphraseOccurrences | KeyphraseOccurrences[]
        ) => {
            await repository.storeTotals(VALID_URL.hostname, pageTotals);

            const actual = await repository.storeTotals(
                VALID_URL.hostname,
                pageTotals
            );

            expect(actual).toBe(true);
        }
    );

    describe("existing total storage", () => {
        test.each([
            ["page total", VALID_URL.hostname],
            ["global total", undefined],
        ])(
            "overwrites single %s if already exists",
            async (message: string, baseURL?: string) => {
                const existingTotal: KeyphraseOccurrences = {
                    keyphrase: TEST_KEYPHRASES[0].keyphrase,
                    occurrences: TEST_KEYPHRASES[0].occurrences + 1,
                };
                await repository.storeTotals(VALID_URL.hostname, existingTotal);

                await repository.storeTotals(
                    VALID_URL.hostname,
                    TEST_KEYPHRASES[0]
                );
                const stored = await repository.getTotals(baseURL);

                expect(stored).toHaveLength(1);
                expect(stored[0]).toEqual(TEST_KEYPHRASES[0]);
            }
        );

        test.each([
            ["page totals", VALID_URL.hostname],
            ["global totals", undefined],
        ])(
            "overwrites all existing %s given multiple clashing totals",
            async (message: string, baseURL?: string) => {
                const existingTotals = TEST_KEYPHRASES.map((keyphrase) => {
                    keyphrase.occurrences += 1;
                    return keyphrase;
                });
                await repository.storeTotals(
                    VALID_URL.hostname,
                    existingTotals
                );

                await repository.storeTotals(
                    VALID_URL.hostname,
                    TEST_KEYPHRASES
                );
                const stored = await repository.getTotals(baseURL);

                expect(stored).toEqual(TEST_KEYPHRASES);
            }
        );
    });

    test("returns failure when storage fails given a single total", async () => {
        const putItemSpy = jest.spyOn(dynamoDB, "transactWriteItems");
        putItemSpy.mockImplementation(() => {
            throw new Error("test error");
        });

        const actual = await repository.storeTotals(
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

        const actual = await repository.storeTotals(
            VALID_URL.hostname,
            TEST_KEYPHRASES
        );
        putItemSpy.mockRestore();

        expect(actual).toBe(false);
    });

    test.each([
        ["global totals", undefined],
        ["page totals", VALID_URL.hostname],
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
                await repository.storeTotals(VALID_URL.hostname, occurrences);
            });

            test("returns success", async () => {
                const actual = await repository.empty();

                expect(actual).toBe(true);
            });

            test("empties table of page totals", async () => {
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
