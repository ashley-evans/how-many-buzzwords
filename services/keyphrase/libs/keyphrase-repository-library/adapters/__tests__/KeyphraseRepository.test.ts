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

const TABLE_NAME = "keyphrase-table";
const VALID_URL = "www.example.com";
const TEST_KEYPHRASES = [
    createKeyphraseOccurrence("test", 5),
    createKeyphraseOccurrence("wibble", 2),
];

const repository = new KeyphraseRepository(TABLE_NAME, true);

describe.each([
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
    const otherURL = "www.text.com";

    beforeAll(async () => {
        await repository.storeKeyphrase(VALID_URL, expectedKeyphrase);
        await repository.storeKeyphrase(otherURL, otherKeyphrase);
    });

    test("get returns only keyphrases related to provided URL", async () => {
        const response = await repository.getKeyphrases(VALID_URL);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(expectedKeyphrase);
    });

    afterAll(async () => {
        await repository.deleteKeyphrases(VALID_URL);
        await repository.deleteKeyphrases(otherURL);
    });
});

describe.each([
    ["one keyphrase occurrence", [TEST_KEYPHRASES[0]]],
    ["multiple keyphrase occurrences", TEST_KEYPHRASES],
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
