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

test('calls request provider with URL', async () => {
    await keyphraseFinder.findKeyphrases(VALID_URL);

    expect(mockRequestProvider.getBody).toHaveBeenCalledTimes(1);
    expect(mockRequestProvider.getBody).toHaveBeenCalledWith(
        VALID_URL
    );
});
