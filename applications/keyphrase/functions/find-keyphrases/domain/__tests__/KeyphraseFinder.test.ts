import { mock } from "jest-mock-extended";
import HTMLParsingProvider from "../../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../../ports/HTTPRequestProvider";
import { KeyphraseProvider } from "../../ports/KeyphraseProvider";
import { KeyphraseRepository } from "../../ports/KeyphraseRepository";
import KeyphraseFinder from "../KeyphraseFinder";

const VALID_URL = new URL('http://www.example.com/');

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

beforeEach(() => {
    jest.resetAllMocks();
});

test('calls request provider with URL', async () => {
    await keyphraseFinder.findKeyphrases(VALID_URL);

    expect(mockRequestProvider.getBody).toHaveBeenCalledTimes(1);
    expect(mockRequestProvider.getBody).toHaveBeenCalledWith(
        VALID_URL
    );
});

test('returns failure if request provider throws an error', async () => {
    mockRequestProvider.getBody.mockRejectedValue(new Error());

    const result = await keyphraseFinder.findKeyphrases(VALID_URL);

    expect(result).toBe(false);
});

test('calls HTML parser with response from request provider', async () => {
    const expectedBody = '<body>Wibble</body>';
    mockRequestProvider.getBody.mockResolvedValue(expectedBody);

    await keyphraseFinder.findKeyphrases(VALID_URL);

    expect(mockHTMLParser.parseHTML).toHaveBeenCalledTimes(1);
    expect(mockHTMLParser.parseHTML).toHaveBeenCalledWith(
        expectedBody
    );
});

test('throws an error if HTML parser throws an error', async () => {
    const expectedError = new Error('test error');
    mockHTMLParser.parseHTML.mockImplementation(() => { throw expectedError; });

    expect.assertions(1);
    await expect(keyphraseFinder.findKeyphrases(VALID_URL)).rejects.toEqual(
        expectedError
    );
});
