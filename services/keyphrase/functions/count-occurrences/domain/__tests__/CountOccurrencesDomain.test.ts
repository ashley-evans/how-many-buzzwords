import { mock } from "jest-mock-extended";
import { TextRepository } from "buzzword-aws-text-repository-library";
import { Repository as KeyphraseRepository } from "buzzword-aws-keyphrase-repository-library";

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
});

test("returns success given no keyphrases", async () => {
    const keyphrases = new Set<string>();

    const actual = await domain.countOccurrences(VALID_URL, keyphrases);

    expect(actual).toBe(true);
});

test("obtains parsed content for URL from repository if given a non-empty set of keyphrases", async () => {
    const keyphrases = new Set(["test"]);

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
