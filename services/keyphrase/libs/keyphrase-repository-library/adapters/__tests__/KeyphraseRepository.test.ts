/**
 * @group integration
 */

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
    "GET: given %s stored for URL",
    (message: string, occurrences: KeyphraseOccurrences[]) => {
        beforeAll(async () => {
            for (const occurrence of occurrences) {
                await repository.storeKeyphrase(
                    VALID_URL.hostname,
                    VALID_URL.pathname,
                    occurrence
                );
            }
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

describe("given keyphrases occurrences stored against multiple paths on base URL", () => {
    const OTHER_PATHNAME = `${VALID_URL.pathname}1`;

    beforeAll(async () => {
        await repository.storeKeyphrase(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
        await repository.storeKeyphrase(
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

describe("given keyphrase occurrences stored for multiple URLs", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[0];
    const otherKeyphrase = TEST_KEYPHRASES[1];

    beforeAll(async () => {
        await repository.storeKeyphrase(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expectedKeyphrase
        );
        await repository.storeKeyphrase(
            OTHER_URL.hostname,
            OTHER_URL.pathname,
            otherKeyphrase
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

describe("PUT: Stores new keyphrase occurrence", () => {
    let response: boolean;

    beforeAll(async () => {
        response = await repository.storeKeyphrase(
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
        await repository.storeKeyphrase(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );

        response = await repository.storeKeyphrase(
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
    "BATCH PUT: Stores all keyphrase occurrences given %s items",
    (message: string, expectedOccurrences: KeyphraseOccurrences[]) => {
        let response: boolean;

        beforeAll(async () => {
            response = await repository.storeKeyphrases(
                VALID_URL.hostname,
                VALID_URL.pathname,
                expectedOccurrences
            );
        });

        test("stores all provided keyphrases occurrences succesfully", async () => {
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

describe("BATCH PUT: Overwrites existing keyphrase occurrences", () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storeKeyphrase(
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

test("delete returns failure given no keyphrase occurrences stored", async () => {
    const response = await repository.deleteKeyphrases(VALID_URL.hostname);

    expect(response).toEqual(false);
});

describe("DELETE: only effects associated keyphrase occurrences", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[1];

    let response: boolean;

    beforeAll(async () => {
        await repository.storeKeyphrase(
            VALID_URL.hostname,
            VALID_URL.pathname,
            TEST_KEYPHRASES[0]
        );
        await repository.storeKeyphrase(
            OTHER_URL.hostname,
            VALID_URL.pathname,
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
            pathname: VALID_URL.pathname,
            keyphrase: expectedKeyphrase.keyphrase,
            occurrences: expectedKeyphrase.occurrences,
        });
    });

    test("deletion returns success", () => {
        expect(response).toEqual(true);
    });
});
