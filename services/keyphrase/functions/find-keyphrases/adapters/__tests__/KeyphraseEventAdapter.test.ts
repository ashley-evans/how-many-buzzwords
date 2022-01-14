import { mock } from "jest-mock-extended";

import KeyphrasesPort from "../../ports/KeyphrasePort";
import {
    KeyphrasesEvent,
    KeyphrasesResponse
} from "../../ports/KeyphrasePrimaryAdapter";
import KeyphraseSQSAdapter from "../KeyphraseEventAdapter";

const mockKeyphrasesPort = mock<KeyphrasesPort>();

const VALID_URL = new URL('https://www.example.com/');

const adapter = new KeyphraseSQSAdapter(mockKeyphrasesPort);

function createEvent(baseURL?: string, pathname?: string): KeyphrasesEvent {
    return {
        baseURL,
        pathname
    };
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe.each([
    [
        'missing baseURL and pathname',
        createEvent()
    ],
    [
        'missing base url',
        createEvent(
            undefined,
            VALID_URL.pathname
        )
    ],
    [
        'invalid base url',
        createEvent(
            `test ${VALID_URL.hostname}`,
            VALID_URL.pathname
        )
    ],
    [
        'invalid base url (protocol provided)',
        createEvent(
            VALID_URL.origin,
            VALID_URL.pathname
        )
    ],
    [
        'missing pathname',
        createEvent(
            VALID_URL.hostname
        )
    ],
    [
        'invalid pathname',
        createEvent(
            VALID_URL.hostname,
            'no backslash'
        )
    ]
])(
    'handles invalid event body with %s',
    (text: string, event: KeyphrasesEvent) => {
        let response: KeyphrasesResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            response = await adapter.findKeyphrases(event);
        });

        test('does not call keyphrases port', () => {
            expect(mockKeyphrasesPort.findKeyphrases).toHaveBeenCalledTimes(0);
        });

        test('returns failure', () => {
            expect(response).toBeDefined();
            expect(response.success).toEqual(false);
        });

        test('returns provided base URL', () => {
            expect(response).toBeDefined();
            expect(response.baseURL).toEqual(event.baseURL);
        });

        test('returns provided pathname', () => {
            expect(response).toBeDefined();
            expect(response.pathname).toEqual(event.pathname);
        });
    }
);

describe('handles a single valid base URL and pathname', () => {
    let response: KeyphrasesResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        const event = createEvent(VALID_URL.hostname, VALID_URL.pathname);
        mockKeyphrasesPort.findKeyphrases.mockResolvedValue(true);

        response = await adapter.findKeyphrases(event);
    });

    test('calls keyphrase finder with combined URL', () => {
        expect(mockKeyphrasesPort.findKeyphrases).toHaveBeenCalledTimes(1);
        expect(mockKeyphrasesPort.findKeyphrases).toHaveBeenCalledWith(
            VALID_URL
        );
    });

    test('returns success if crawl succeeds', () => {
        expect(response).toBeDefined();
        expect(response.success).toEqual(true);
    });

    test('returns validated base URL', () => {
        expect(response).toBeDefined();
        expect(response.baseURL).toEqual(VALID_URL.hostname);
    });

    test('returns validated pathname', () => {
        expect(response).toBeDefined();
        expect(response.pathname).toEqual(VALID_URL.pathname);
    });
});

describe('error handling', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test(
        'throws keyphrase error if keyphrase finder throws an error',
        async () => {
            const event = createEvent(
                VALID_URL.hostname,
                VALID_URL.pathname
            );

            mockKeyphrasesPort.findKeyphrases.mockRejectedValue(new Error());

            expect.assertions(1);
            await expect(adapter.findKeyphrases(event)).rejects.toEqual(
                expect.objectContaining({
                    name: 'KeyphrasesError'
                })
            );
        }
    );

    test('throws keyphrase error if keyphase finder fails', async () => {
        const event = createEvent(VALID_URL.hostname, VALID_URL.pathname);
        mockKeyphrasesPort.findKeyphrases.mockResolvedValue(false);

        expect.assertions(1);
        await expect(adapter.findKeyphrases(event)).rejects.toEqual(
            expect.objectContaining({
                name: 'KeyphrasesError'
            })
        );
    });
});
