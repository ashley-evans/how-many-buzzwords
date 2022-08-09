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

test("stores a single occurrence against the URL given a single match against a single keyphrase", async () => {
    const expectedKeyphrase: KeyphraseOccurrences = {
        keyphrase: "test",
        occurrences: 1,
    };
    const keyphrases = new Set([expectedKeyphrase.keyphrase]);
    mockParsedContentRepository.getPageText.mockResolvedValue(
        expectedKeyphrase.keyphrase
    );

    await domain.countOccurrences(VALID_URL, keyphrases);

    expect(mockKeyphraseRepository.storeKeyphrases).toHaveBeenCalledTimes(1);
    expect(mockKeyphraseRepository.storeKeyphrases).toHaveBeenCalledWith(
        VALID_URL.hostname,
        VALID_URL.pathname,
        expectedKeyphrase
    );
});

test("stores several occurrences against the URL given multiple matches against a single keyphrase", async () => {
    const expectedKeyphrase: KeyphraseOccurrences = {
        keyphrase: "test",
        occurrences: 3,
    };
    const keyphrases = new Set([expectedKeyphrase.keyphrase]);
    mockParsedContentRepository.getPageText.mockResolvedValue("test test test");

    await domain.countOccurrences(VALID_URL, keyphrases);

    expect(mockKeyphraseRepository.storeKeyphrases).toHaveBeenCalledTimes(1);
    expect(mockKeyphraseRepository.storeKeyphrases).toHaveBeenCalledWith(
        VALID_URL.hostname,
        VALID_URL.pathname,
        expectedKeyphrase
    );
});

test("does not store any occurrences against the URL given no matches against a single keyphrase", async () => {
    const keyphrases = new Set(["test"]);
    mockParsedContentRepository.getPageText.mockResolvedValue(
        "something different"
    );

    await domain.countOccurrences(VALID_URL, keyphrases);

    expect(mockKeyphraseRepository.storeKeyphrases).not.toHaveBeenCalled();
});
