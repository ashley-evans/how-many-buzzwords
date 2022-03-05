/**
 * @group integration
 */

import dynamoose from "dynamoose";

import { KeyphraseOccurrences } from "../../ports/Repository";
import KeyphraseRepository from "../KeyphraseRepository";

dynamoose.aws.sdk.config.update({
    region: "eu-west-2",
    credentials: {
        accessKeyId: "x",
        secretAccessKey: "x",
    },
});
dynamoose.aws.ddb.local();

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
const VALID_URL = "www.example.com";
const OTHER_URL = "www.test.com";
const TEST_KEYPHRASES = [
    createKeyphraseOccurrence("test", 5),
    createKeyphraseOccurrence("wibble", 2),
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
                await repository.storeKeyphrase(VALID_URL, occurrence);
            }
        });

        test("get returns each keyphrase occurrence", async () => {
            const response = await repository.getKeyphrases(VALID_URL);

            expect(response).toHaveLength(occurrences.length);
            expect(response).toEqual(expect.arrayContaining(occurrences));
        });

        afterAll(async () => {
            await repository.deleteKeyphrases(VALID_URL);
        });
    }
);

describe("given keyphrase occurrences stored for multiple URLs", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[0];
    const otherKeyphrase = TEST_KEYPHRASES[1];

    beforeAll(async () => {
        await repository.storeKeyphrase(VALID_URL, expectedKeyphrase);
        await repository.storeKeyphrase(OTHER_URL, otherKeyphrase);
    });

    test("get returns only keyphrases related to provided URL", async () => {
        const response = await repository.getKeyphrases(VALID_URL);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(expectedKeyphrase);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL);
        await repository.deleteKeyphrases(OTHER_URL);
    });
});

describe("PUT: Stores new keyphrase occurrence", () => {
    let response: boolean;

    beforeAll(async () => {
        response = await repository.storeKeyphrase(
            VALID_URL,
            TEST_KEYPHRASES[0]
        );
    });

    test("stores the keyphrase occurrence successfully", async () => {
        const result = await repository.getKeyphrases(VALID_URL);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(TEST_KEYPHRASES[0]);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL);
    });
});

describe("PUT: Overwrites existing keyphrase occurrence", () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storeKeyphrase(VALID_URL, TEST_KEYPHRASES[0]);

        response = await repository.storeKeyphrase(
            VALID_URL,
            TEST_KEYPHRASES[0]
        );
    });

    test("does not add duplicate keyphrase occurrences", async () => {
        const result = await repository.getKeyphrases(VALID_URL);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(TEST_KEYPHRASES[0]);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL);
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
                VALID_URL,
                expectedOccurrences
            );
        });

        test("stores all provided keyphrases occurrences succesfully", async () => {
            const results = await repository.getKeyphrases(VALID_URL);

            expect(results).toHaveLength(expectedOccurrences.length);
            expect(results).toEqual(
                expect.arrayContaining(expectedOccurrences)
            );
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });

        afterAll(async () => {
            await repository.deleteKeyphrases(VALID_URL);
        });
    }
);

describe("BATCH PUT: Overwrites existing keyphrase occurrences", () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storeKeyphrase(VALID_URL, TEST_KEYPHRASES[0]);
        response = await repository.storeKeyphrases(VALID_URL, TEST_KEYPHRASES);
    });

    test("does not add duplicate keyphrase occurrences", async () => {
        const results = await repository.getKeyphrases(VALID_URL);

        expect(results).toHaveLength(TEST_KEYPHRASES.length);
        expect(results).toEqual(expect.arrayContaining(TEST_KEYPHRASES));
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL);
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
            for (const occurrence of occurrences) {
                await repository.storeKeyphrase(VALID_URL, occurrence);
            }

            response = await repository.deleteKeyphrases(VALID_URL);
        });

        test("returns no pathnames following deletion", async () => {
            const result = await repository.getKeyphrases(VALID_URL);

            expect(result).toHaveLength(0);
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });
    }
);

test("delete returns failure given no keyphrase occurrences stored", async () => {
    const response = await repository.deleteKeyphrases(VALID_URL);

    expect(response).toEqual(false);
});

describe("DELETE: only effects associated keyphrase occurrences", () => {
    const expectedKeyphrase = TEST_KEYPHRASES[1];

    let response: boolean;

    beforeAll(async () => {
        await repository.storeKeyphrase(VALID_URL, TEST_KEYPHRASES[0]);
        await repository.storeKeyphrase(OTHER_URL, expectedKeyphrase);

        response = await repository.deleteKeyphrases(VALID_URL);
    });

    test("returns no keyphrase occurrences for affected URL", async () => {
        const result = await repository.getKeyphrases(VALID_URL);

        expect(result).toHaveLength(0);
    });

    test("returns keyphrase occurrences for non-affected URL", async () => {
        const result = await repository.getKeyphrases(OTHER_URL);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expectedKeyphrase);
    });

    test("deletion returns success", () => {
        expect(response).toEqual(true);
    });
});
