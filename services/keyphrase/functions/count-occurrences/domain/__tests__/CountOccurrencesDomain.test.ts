import { mock } from "jest-mock-extended";
import { TextRepository } from "buzzword-aws-text-repository-library";
import {
    KeyphraseOccurrences,
    Repository as KeyphraseRepository,
} from "buzzword-aws-keyphrase-repository-library";

import CountOccurrencesDomain from "../CountOccurrencesDomain";

const VALID_URL = new URL("https://www.example.com/");

const mockParsedContentRepository = mock<TextRepository>();
const mockKeyphraseRepository = mock<KeyphraseRepository>();

const domain = new CountOccurrencesDomain(
    mockParsedContentRepository,
    mockKeyphraseRepository
);

beforeEach(() => {
    mockParsedContentRepository.getPageText.mockReset();
    mockKeyphraseRepository.storeKeyphrases.mockReset();
});

test("returns success given no keyphrases", async () => {
    const keyphrases = new Set<string>();

    const actual = await domain.countOccurrences(VALID_URL, keyphrases);

    expect(actual).toBe(true);
});

test("obtains parsed content for URL from repository if given a non-empty set of keyphrases", async () => {
    const keyphrases = new Set(["test"]);
    mockParsedContentRepository.getPageText.mockResolvedValue("");

    await domain.countOccurrences(VALID_URL, keyphrases);

    expect(mockParsedContentRepository.getPageText).toHaveBeenCalledTimes(1);
    expect(mockParsedContentRepository.getPageText).toHaveBeenCalledWith(
        VALID_URL
    );
});

test("does not obtain parsed content for URL if given no keyphrases", async () => {
    const keyphrases = new Set<string>();

    await domain.countOccurrences(VALID_URL, keyphrases);

    expect(mockParsedContentRepository.getPageText).not.toHaveBeenCalled();
});

test("returns failure if an error occurred while obtaining parsed content for URL", async () => {
    const keyphrases = new Set(["test"]);
    mockParsedContentRepository.getPageText.mockRejectedValue(new Error());

    const actual = await domain.countOccurrences(VALID_URL, keyphrases);

    expect(actual).toBe(false);
});

test.each([
    [
        "a single occurrence against the URL given a single match",
        "test",
        "wibble test",
        1,
    ],
    [
        "several occurrences against the URL given multiple matches",
        "test",
        "wibble test test test wibble",
        3,
    ],
    [
        "a single occurrence against the URL given a single match (different casing)",
        "wibble",
        "WIBBLE test",
        1,
    ],
    [
        "several occurrences against the URL given multiple matches (different casing)",
        "wibble",
        "WIBBLE test test test WIBBLE",
        2,
    ],
])(
    "stores %s against a single keyphrase",
    async (
        message: string,
        keyphrase: string,
        content: string,
        expectedOccurences: number
    ) => {
        const keyphrases = new Set([keyphrase]);
        mockParsedContentRepository.getPageText.mockResolvedValue(content);

        await domain.countOccurrences(VALID_URL, keyphrases);

        const expectedKeyphrase: KeyphraseOccurrences = {
            keyphrase,
            occurrences: expectedOccurences,
        };
        expect(mockKeyphraseRepository.storeKeyphrases).toHaveBeenCalledTimes(
            1
        );
        expect(mockKeyphraseRepository.storeKeyphrases).toHaveBeenCalledWith(
            VALID_URL.hostname,
            VALID_URL.pathname,
            [expectedKeyphrase]
        );
    }
);

test.each([
    ["a single keyphrase", ["test"]],
    ["multiple keyphrases", ["test", "wibble"]],
])(
    "does not store any occurrences against the URL given no matches against a single keyphrase",
    async (message: string, input: string[]) => {
        const keyphrases = new Set(input);
        mockParsedContentRepository.getPageText.mockResolvedValue(
            "something different"
        );

        await domain.countOccurrences(VALID_URL, keyphrases);

        expect(mockKeyphraseRepository.storeKeyphrases).not.toHaveBeenCalled();
    }
);

test("stores multiple occurrences against the URL given matches on multiple words", async () => {
    const expected: KeyphraseOccurrences[] = [
        {
            keyphrase: "test",
            occurrences: 2,
        },
        {
            keyphrase: "interface",
            occurrences: 3,
        },
    ];
    mockParsedContentRepository.getPageText.mockResolvedValue(
        "test test wibble interface interface interface wobble"
    );

    await domain.countOccurrences(
        VALID_URL,
        new Set(expected.map((value) => value.keyphrase))
    );

    expect(mockKeyphraseRepository.storeKeyphrases).toHaveBeenCalledTimes(1);
    expect(mockKeyphraseRepository.storeKeyphrases).toHaveBeenCalledWith(
        VALID_URL.hostname,
        VALID_URL.pathname,
        expected
    );
});
