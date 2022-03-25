import { mock } from "jest-mock-extended";
import {
    Repository,
    KeyphraseOccurrences,
    PathnameOccurrences,
} from "buzzword-aws-keyphrase-repository-library";

import HTMLParsingProvider from "../../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../../ports/HTTPRequestProvider";
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
const VALID_BODY = `<body>${PARSED_BODY}</body>`;

const mockRequestProvider = mock<HTTPRequestProvider>();
const mockHTMLParser = mock<HTMLParsingProvider>();
const mockKeyphraseProvider = mock<KeyphraseProvider>();
const mockOccurrenceCounter = mock<OccurrenceCounter>();
const mockRepository = mock<Repository>();

const keyphraseFinder = new KeyphraseFinder(
    mockRequestProvider,
    mockHTMLParser,
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

function createPathnameOccurrence(
    pathname: string,
    keyphrase: string,
    occurrences: number
): PathnameOccurrences {
    return {
        pathname,
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

        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);
        mockHTMLParser.parseHTML.mockReturnValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse(KEYWORDS, KEYPHRASES)
        );
        mockRepository.getKeyphrases.mockResolvedValue([]);
        mockRepository.storeKeyphrases.mockResolvedValue(true);
        mockOccurrenceCounter.countOccurrences.mockReturnValue(1);

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test("calls request provider with URL", () => {
        expect(mockRequestProvider.getBody).toHaveBeenCalledTimes(1);
        expect(mockRequestProvider.getBody).toHaveBeenCalledWith(VALID_URL);
    });

    test("calls HTML parser with response from request provider", () => {
        expect(mockHTMLParser.parseHTML).toHaveBeenCalledTimes(1);
        expect(mockHTMLParser.parseHTML).toHaveBeenCalledWith(VALID_BODY);
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

        mockRequestProvider.getBody.mockResolvedValue("");

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test("does not call HTML parser", () => {
        expect(mockHTMLParser.parseHTML).toHaveBeenCalledTimes(0);
    });

    test("returns true", () => {
        expect(response).toBe(true);
    });
});

describe("handles no keywords found", () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);
        mockHTMLParser.parseHTML.mockReturnValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse([], [])
        );
        mockRepository.getKeyphrases.mockResolvedValue([]);

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

        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);
        mockHTMLParser.parseHTML.mockReturnValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse(KEYWORDS, KEYPHRASES)
        );

        const previousOccurrences = [
            ...PREVIOUS_KEYWORDS,
            ...PREVIOUS_KEYPHRASES,
        ].map((phrase) =>
            createPathnameOccurrence(VALID_URL.pathname, phrase, 1)
        );
        mockRepository.getKeyphrases.mockResolvedValue(previousOccurrences);
        mockOccurrenceCounter.countOccurrences.mockReturnValue(1);

        await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test("requests previous keyphrases from repository for URL provided", () => {
        expect(mockRepository.getKeyphrases).toBeCalledTimes(1);
        expect(mockRepository.getKeyphrases).toBeCalledWith(VALID_URL.hostname);
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

        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);
        mockHTMLParser.parseHTML.mockReturnValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse(KEYWORDS, KEYPHRASES)
        );
        mockRepository.getKeyphrases.mockResolvedValue([]);
        mockOccurrenceCounter.countOccurrences.mockReturnValue(1);
    });

    test("returns failure if request provider throws an error", async () => {
        mockRequestProvider.getBody.mockRejectedValue(new Error());

        const result = await keyphraseFinder.findKeyphrases(VALID_URL);

        expect(result).toBe(false);
    });

    test("throws an error if HTML parser throws an error", async () => {
        const expectedError = new Error("test error");
        mockHTMLParser.parseHTML.mockImplementation(() => {
            throw expectedError;
        });

        expect.assertions(1);
        await expect(keyphraseFinder.findKeyphrases(VALID_URL)).rejects.toEqual(
            expectedError
        );
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
        mockRepository.getKeyphrases.mockRejectedValue(new Error());

        const result = await keyphraseFinder.findKeyphrases(VALID_URL);

        expect(result).toBe(false);
    });
});
