import { mock } from "jest-mock-extended";

import KeyphrasesPort from "../../ports/KeyphrasePort.js";
import { KeyphrasesEvent } from "../../ports/KeyphrasePrimaryAdapter.js";
import KeyphraseSQSAdapter from "../KeyphraseEventAdapter.js";

const mockKeyphrasesPort = mock<KeyphrasesPort>();

const VALID_URL = new URL("https://www.example.com/");

const adapter = new KeyphraseSQSAdapter(mockKeyphrasesPort);

function createEvent(
    baseURL?: string,
    pathname?: string
): Partial<KeyphrasesEvent> {
    return {
        baseURL,
        pathname,
    };
}

beforeEach(() => {
    mockKeyphrasesPort.findKeyphrases.mockReset();
});

test.each([
    ["missing baseURL and pathname", createEvent()],
    ["missing base url", createEvent(undefined, VALID_URL.pathname)],
    [
        "invalid base url (spaces)",
        createEvent(`test ${VALID_URL.hostname}`, VALID_URL.pathname),
    ],
    ["an invalid URL (numeric)", createEvent("1", VALID_URL.pathname)],
    ["missing pathname", createEvent(VALID_URL.hostname)],
    ["invalid pathname", createEvent(VALID_URL.hostname, "no backslash")],
])(
    "throws an error if an invalid event with %s is provided",
    async (message: string, event: Partial<KeyphrasesEvent>) => {
        expect.assertions(1);
        await expect(adapter.findKeyphrases(event)).rejects.toEqual(
            expect.objectContaining({
                message: expect.stringContaining(
                    "Exception occurred during event validation:"
                ),
            })
        );
    }
);

test.each([
    ["includes protocol", VALID_URL.origin, VALID_URL.pathname, VALID_URL],
    ["excludes protocol", VALID_URL.hostname, VALID_URL.pathname, VALID_URL],
])(
    "attempts to find keyphrases with provided URL (%s)",
    async (
        message: string,
        baseURL: string,
        pathname: string,
        expected: URL
    ) => {
        mockKeyphrasesPort.findKeyphrases.mockResolvedValue(new Set());
        const event = createEvent(baseURL, pathname);

        await adapter.findKeyphrases(event);

        expect(mockKeyphrasesPort.findKeyphrases).toHaveBeenCalledTimes(1);
        expect(mockKeyphrasesPort.findKeyphrases).toHaveBeenCalledWith(
            expected
        );
    }
);

test("returns keyphrases found from analysis in response", async () => {
    const expected = ["wibble", "test"];
    mockKeyphrasesPort.findKeyphrases.mockResolvedValue(new Set(expected));
    const event = createEvent(VALID_URL.origin, VALID_URL.pathname);

    const actual = await adapter.findKeyphrases(event);

    expect(actual).toEqual(expected);
});

test("throws an error if an unhandled error is thrown while finding keyphrases", async () => {
    const expectedError = new Error("test");
    mockKeyphrasesPort.findKeyphrases.mockRejectedValue(expectedError);
    const event = createEvent(VALID_URL.origin, VALID_URL.pathname);

    expect.assertions(1);
    await expect(adapter.findKeyphrases(event)).rejects.toEqual(expectedError);
});
