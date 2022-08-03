import { mock } from "jest-mock-extended";
import {
    Repository,
    KeyphraseOccurrences,
} from "buzzword-aws-keyphrase-repository-library";
import { TextRepository } from "buzzword-aws-text-repository-library";

import {
    KeyphraseProvider,
    KeyphraseResponse,
} from "../../ports/KeyphraseProvider";
import OccurrenceCounter from "../../ports/OccurrenceCounter";
import KeyphraseFinder from "../KeyphraseFinder";

const VALID_URL = new URL("http://www.example.com/");
const KEYWORDS = ["Wibble", "Wobble"];
const KEYPHRASES = ["Wibble Wobble"];
const NEW_PHRASES = [...KEYWORDS, ...KEYPHRASES];
const PREVIOUS_KEYWORDS = ["Wibble", "Wibbly"];
const PREVIOUS_KEYPHRASES = ["Wibble Wobble", "Wobble Wibble"];
const PREVIOUS_PHRASES = [...PREVIOUS_KEYWORDS, ...PREVIOUS_KEYPHRASES];
const ALL_PHRASES = [...NEW_PHRASES, ...PREVIOUS_PHRASES];
const PARSED_BODY = KEYWORDS.join(" ");

const mockParsedContentProvider = mock<TextRepository>();
const mockKeyphraseProvider = mock<KeyphraseProvider>();
const mockOccurrenceCounter = mock<OccurrenceCounter>();
const mockRepository = mock<Repository>();

const keyphraseFinder = new KeyphraseFinder(
    mockParsedContentProvider,
    mockKeyphraseProvider,
    mockOccurrenceCounter,
    mockRepository
);

function createKeyphraseResponse(
    keywords: string[],
    keyphrases: string[]
): KeyphraseResponse {
    return {
        keywords,
        keyphrases,
    };
}

function createKeyphraseOccurrence(
    keyphrase: string,
    occurrences: number
): KeyphraseOccurrences {
    return {
        keyphrase,
        occurrences,
    };
}

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("happy path", () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockParsedContentProvider.getPageText.mockResolvedValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse(KEYWORDS, KEYPHRASES)
        );
        mockRepository.getPathKeyphrases.mockResolvedValue([]);
        mockRepository.storeKeyphrases.mockResolvedValue(true);
        mockOccurrenceCounter.countOccurrences.mockReturnValue(1);

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test("calls the text repository to get the URLs parsed content with URL", () => {
        expect(mockParsedContentProvider.getPageText).toHaveBeenCalledTimes(1);
        expect(mockParsedContentProvider.getPageText).toHaveBeenCalledWith(
            VALID_URL
        );
    });

    test("calls keyphrase provider with parsed HTML text", () => {
        expect(mockKeyphraseProvider.findKeyphrases).toHaveBeenCalledTimes(1);
        expect(mockKeyphraseProvider.findKeyphrases).toHaveBeenCalledWith(
            PARSED_BODY
        );
    });

    test("calls occurrence counter for all words/phrases in keyphrase response", () => {
        expect(mockOccurrenceCounter.countOccurrences).toBeCalledTimes(
            KEYWORDS.length + KEYPHRASES.length
        );
    });

    test("calls occurrence counter with each word from keyphrase response", () => {
        for (const keyword of KEYWORDS) {
            expect(mockOccurrenceCounter.countOccurrences).toBeCalledWith(
                PARSED_BODY,
                keyword
            );
        }
    });

    test("calls occurrence counter with each phrase from keyphrase response", () => {
        for (const keyphrase of KEYPHRASES) {
            expect(mockOccurrenceCounter.countOccurrences).toBeCalledWith(
                PARSED_BODY,
                keyphrase
            );
        }
    });

    test("calls keyphrase repository for all keywords/keyphrase occurrences", () => {
        expect(mockRepository.storeKeyphrases).toBeCalledTimes(1);

        const expected = NEW_PHRASES.map((phrase) =>
            createKeyphraseOccurrence(phrase, 1)
        );
        expect(mockRepository.storeKeyphrases).toBeCalledWith(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expected
        );
    });

    test("returns success", () => {
        expect(response).toBe(true);
    });
});

describe("handles no page content", () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockParsedContentProvider.getPageText.mockResolvedValue("");

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test("does not attempt to find keyphrases", () => {
        expect(mockKeyphraseProvider.findKeyphrases).not.toHaveBeenCalled();
    });

    test("does not attempt to account occurrences", () => {
        expect(mockOccurrenceCounter.countOccurrences).not.toHaveBeenCalled();
    });

    test("does not attempt to store any keyphrase occurrences", () => {
        expect(mockRepository.storeKeyphrases).not.toHaveBeenCalled();
    });

    test("returns true", () => {
        expect(response).toBe(true);
    });
});

describe("handles no keywords found", () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockParsedContentProvider.getPageText.mockResolvedValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse([], [])
        );
        mockRepository.getPathKeyphrases.mockResolvedValue([]);

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test("does not call count occurrences", () => {
        expect(mockOccurrenceCounter.countOccurrences).toBeCalledTimes(0);
    });

    test("does not attempt to store any keyphrase occurrences", () => {
        expect(mockRepository.storeKeyphrases).toBeCalledTimes(0);
    });

    test("returns true", () => {
        expect(response).toBe(true);
    });
});

describe("handles existing keyphrases", () => {
    const expectedPhrases = [...new Set(ALL_PHRASES)];

    beforeAll(async () => {
        jest.resetAllMocks();

        mockParsedContentProvider.getPageText.mockResolvedValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse(KEYWORDS, KEYPHRASES)
        );

        const previousOccurrences = [
            ...PREVIOUS_KEYWORDS,
            ...PREVIOUS_KEYPHRASES,
        ].map((phrase) => createKeyphraseOccurrence(phrase, 1));
        mockRepository.getPathKeyphrases.mockResolvedValue(previousOccurrences);
        mockOccurrenceCounter.countOccurrences.mockReturnValue(1);

        await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test("requests previous keyphrases from repository for URL and path provided", () => {
        expect(mockRepository.getPathKeyphrases).toBeCalledTimes(1);
        expect(mockRepository.getPathKeyphrases).toBeCalledWith(
            VALID_URL.hostname,
            VALID_URL.pathname
        );
    });

    test("counts only unique keyphrases/words occurrences in text", () => {
        expect(mockOccurrenceCounter.countOccurrences).toBeCalledTimes(
            expectedPhrases.length
        );
        for (const phrase of expectedPhrases) {
            expect(mockOccurrenceCounter.countOccurrences).toBeCalledWith(
                PARSED_BODY,
                phrase
            );
        }
    });

    test("stores combined occurrences in DynamoDB", () => {
        const expected = expectedPhrases.map((phrase) => {
            if (PREVIOUS_PHRASES.includes(phrase)) {
                return createKeyphraseOccurrence(phrase, 2);
            }

            return createKeyphraseOccurrence(phrase, 1);
        });

        expect(mockRepository.storeKeyphrases).toBeCalledTimes(1);
        expect(mockRepository.storeKeyphrases).toBeCalledWith(
            VALID_URL.hostname,
            VALID_URL.pathname,
            expected
        );
    });
});

describe("error handling", () => {
    beforeEach(() => {
        jest.resetAllMocks();

        mockParsedContentProvider.getPageText.mockResolvedValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse(KEYWORDS, KEYPHRASES)
        );
        mockRepository.getPathKeyphrases.mockResolvedValue([]);
        mockOccurrenceCounter.countOccurrences.mockReturnValue(1);
    });

    test("returns failure if an unexpected error occurs getting parsed content", async () => {
        mockParsedContentProvider.getPageText.mockRejectedValue(new Error());

        const result = await keyphraseFinder.findKeyphrases(VALID_URL);

        expect(result).toBe(false);
    });

    test("throws an error if Keyphrase provider throws an error", async () => {
        const expectedError = new Error("test error");
        mockKeyphraseProvider.findKeyphrases.mockRejectedValue(expectedError);

        expect.assertions(1);
        await expect(keyphraseFinder.findKeyphrases(VALID_URL)).rejects.toEqual(
            expectedError
        );
    });

    test("returns failure if storing of occurrences throws an error", async () => {
        mockRepository.storeKeyphrases.mockRejectedValue(new Error());

        const result = await keyphraseFinder.findKeyphrases(VALID_URL);

        expect(result).toBe(false);
    });

    test("returns failure if storing of occurrences returns failure", async () => {
        mockRepository.storeKeyphrases.mockResolvedValue(false);

        const result = await keyphraseFinder.findKeyphrases(VALID_URL);

        expect(result).toBe(false);
    });

    test("returns failure if previous keyphrase retrieval throws an error", async () => {
        mockRepository.getPathKeyphrases.mockRejectedValue(new Error());

        const result = await keyphraseFinder.findKeyphrases(VALID_URL);

        expect(result).toBe(false);
    });
});
