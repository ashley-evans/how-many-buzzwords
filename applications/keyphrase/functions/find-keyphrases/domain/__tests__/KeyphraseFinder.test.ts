import { mock } from "jest-mock-extended";
import HTMLParsingProvider from "../../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../../ports/HTTPRequestProvider";
import { KeyphraseProvider } from "../../ports/KeyphraseProvider";
import { KeyphraseRepository } from "../../ports/KeyphraseRepository";
import KeyphraseFinder from "../KeyphraseFinder";

const VALID_URL = new URL('http://www.example.com/');
const VALID_BODY = '<body>Wibble</body>';

const mockKeyphraseProvider = mock<KeyphraseProvider>();
const mockRequestProvider = mock<HTTPRequestProvider>();
const mockHTMLParser = mock<HTMLParsingProvider>();
const mockRepository = mock<KeyphraseRepository>();

const keyphraseFinder = new KeyphraseFinder(
    mockRequestProvider,
    mockHTMLParser,
    mockKeyphraseProvider,
    mockRepository
);

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('happy path', () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        mockRequestProvider.getBody.mockResolvedValue(VALID_BODY);

        response = await keyphraseFinder.findKeyphrases(VALID_URL);
    });

    test('calls request provider with URL', async () => {
        expect(mockRequestProvider.getBody).toHaveBeenCalledTimes(1);
        expect(mockRequestProvider.getBody).toHaveBeenCalledWith(
            VALID_URL
        );
    });

    test('calls HTML parser with response from request provider', async () => {
        expect(mockHTMLParser.parseHTML).toHaveBeenCalledTimes(1);
        expect(mockHTMLParser.parseHTML).toHaveBeenCalledWith(VALID_BODY);
    });

    test('returns success', () => {
        expect(response).toBe(true);
    });
});

test('returns failure if request provider throws an error', async () => {
    mockRequestProvider.getBody.mockRejectedValue(new Error());

    const result = await keyphraseFinder.findKeyphrases(VALID_URL);

    expect(result).toBe(false);
});

test('throws an error if HTML parser throws an error', async () => {
    jest.resetAllMocks();

    const expectedError = new Error('test error');
    mockHTMLParser.parseHTML.mockImplementation(() => { throw expectedError; });

    expect.assertions(1);
    await expect(keyphraseFinder.findKeyphrases(VALID_URL)).rejects.toEqual(
        expectedError
    );
});
