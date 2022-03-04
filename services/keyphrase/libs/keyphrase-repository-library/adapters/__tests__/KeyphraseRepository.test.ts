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
    ["one", [TEST_KEYPHRASES[0]]],
    ["multiple", TEST_KEYPHRASES],
])(
    "given %s keyphrase occurrences stored for URL",
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
