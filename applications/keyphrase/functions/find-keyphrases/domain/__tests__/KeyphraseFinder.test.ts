import { mock } from "jest-mock-extended";
import HTMLParsingProvider from "../../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../../ports/HTTPRequestProvider";
import {
    KeyphraseProvider,
    KeyphraseResponse
} from "../../ports/KeyphraseProvider";
import {
    KeyphraseOccurrences,
    KeyphraseRepository
} from "../../ports/KeyphraseRepository";
import OccurrenceCounter from "../../ports/OccurrenceCounter";
import KeyphraseFinder from "../KeyphraseFinder";

const VALID_URL = new URL('http://www.example.com/');
const KEYWORDS = ['Wibble', 'Wobble'];
const KEYPHRASES = ['Wibble Wobble'];
const PARSED_BODY = KEYWORDS.join(' ');
const VALID_BODY = `<body>${PARSED_BODY}</body>`;

const mockRequestProvider = mock<HTTPRequestProvider>();
const mockHTMLParser = mock<HTMLParsingProvider>();
const mockKeyphraseProvider = mock<KeyphraseProvider>();
const mockOccurrenceCounter = mock<OccurrenceCounter>();
const mockRepository = mock<KeyphraseRepository>();

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
) : KeyphraseResponse {
    return {
        keywords,
        keyphrases
    };
}

function createKeyphraseOccurrence(
    keyphrase: string,
    occurrences: number
): KeyphraseOccurrences {
    return {
        keyphrase,
        occurrences
    };
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('happy path', () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);
        mockHTMLParser.parseHTML.mockReturnValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse(KEYWORDS, KEYPHRASES)
        );
        mockOccurrenceCounter.countOccurrences.mockReturnValue(1);

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test('calls request provider with URL', () => {
        expect(mockRequestProvider.getBody).toHaveBeenCalledTimes(1);
        expect(mockRequestProvider.getBody).toHaveBeenCalledWith(
            VALID_URL
        );
    });

    test('calls HTML parser with response from request provider', () => {
        expect(mockHTMLParser.parseHTML).toHaveBeenCalledTimes(1);
        expect(mockHTMLParser.parseHTML).toHaveBeenCalledWith(VALID_BODY);
    });

    test('calls keyphrase provider with parsed HTML text', () => {
        expect(mockKeyphraseProvider.findKeyphrases).toHaveBeenCalledTimes(1);
        expect(mockKeyphraseProvider.findKeyphrases).toHaveBeenCalledWith(
            PARSED_BODY
        );
    });

    test(
        'calls occurrence counter for all words/phrases in keyphrase response',
        () => {
            expect(mockOccurrenceCounter.countOccurrences).toBeCalledTimes(
                KEYWORDS.length + KEYPHRASES.length
            );
        }
    );

    test(
        'calls occurrence counter with each word from keyphrase response',
        () => {
            for (const keyword of KEYWORDS) {
                expect(mockOccurrenceCounter.countOccurrences).toBeCalledWith(
                    PARSED_BODY,
                    keyword
                );
            }
        }
    );

    test(
        'calls occurrence counter with each phrase from keyphrase response',
        () => {
            for (const keyphrase of KEYPHRASES) {
                expect(mockOccurrenceCounter.countOccurrences).toBeCalledWith(
                    PARSED_BODY,
                    keyphrase
                );
            }
        }
    );

    test(
        'calls keyphrase repository for all keywords/keyphrase occurrences',
        () => {
            expect(mockRepository.storeOccurrences).toBeCalledTimes(1);

            const keywordOccurrences = KEYWORDS.map(
                (word) => createKeyphraseOccurrence(word, 1)
            );
            const keyphraseOccurrences = KEYPHRASES.map(
                (keyphrase) => createKeyphraseOccurrence(keyphrase, 1)
            );
            const expected = [
                ...keywordOccurrences,
                ...keyphraseOccurrences
            ];

            expect(mockRepository.storeOccurrences).toBeCalledWith(
                VALID_URL.hostname,
                expected
            );
        }
    );

    test('returns success', () => {
        expect(response).toBe(true);
    });
});

describe('handles no page content', () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockRequestProvider.getBody.mockResolvedValue('');

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test('does not call HTML parser', () => {
        expect(mockHTMLParser.parseHTML).toHaveBeenCalledTimes(0);
    });

    test('returns true', () => {
        expect(response).toBe(true);
    });
});

describe('handles no keywords found', () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);
        mockHTMLParser.parseHTML.mockReturnValue(PARSED_BODY);
        mockKeyphraseProvider.findKeyphrases.mockResolvedValue(
            createKeyphraseResponse([], [])
        );

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test('does not call count occurrences', () => {
        expect(mockOccurrenceCounter.countOccurrences).toBeCalledTimes(0);
    });

    test('returns true', () => {
        expect(response).toBe(true);
    });
});

describe('error handling', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('returns failure if request provider throws an error', async () => {
        mockRequestProvider.getBody.mockRejectedValue(new Error());
    
        const result = await keyphraseFinder.findKeyphrases(VALID_URL);
    
        expect(result).toBe(false);
    });

    test('throws an error if HTML parser throws an error', async () => {
        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);

        const expectedError = new Error('test error');
        mockHTMLParser.parseHTML.mockImplementation(
            () => { throw expectedError; }
        );
    
        expect.assertions(1);
        await expect(keyphraseFinder.findKeyphrases(VALID_URL)).rejects.toEqual(
            expectedError
        );
    });
    
    test('throws an error if Keyphrase provider throws an error', async () => {
        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);

        const expectedError = new Error('test error');
        mockKeyphraseProvider.findKeyphrases.mockRejectedValue(expectedError);

        expect.assertions(1);
        await expect(keyphraseFinder.findKeyphrases(VALID_URL)).rejects.toEqual(
            expectedError
        );
    });
});
