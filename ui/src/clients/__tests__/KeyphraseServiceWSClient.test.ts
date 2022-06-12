import WS from "jest-websocket-mock";
import { Observable } from "rxjs";

import { PathnameOccurrences } from "../interfaces/KeyphraseServiceClient";
import KeyphraseServiceWSClient from "../KeyphraseServiceWSClient";

const KEYPHRASE_ENDPOINT = new URL("wss://www.example.com/$default");
const BASE_URL = new URL("https://www.example/");
const EXPECTED_CONNECTION_ENDPOINT = new URL(
    `${KEYPHRASE_ENDPOINT.toString()}?baseURL=${BASE_URL.toString()}`
);

function receiveObservableOutput<T>(observable: Observable<T>): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const results: T[] = [];
        observable.subscribe({
            next: (value: T) => results.push(value),
            complete: () => resolve(results),
            error: (ex: unknown) => reject(ex),
        });
    });
}

beforeEach(() => {
    jest.resetAllMocks();
    WS.clean();
});

test("client connects to provided web socket server on creation", async () => {
    const server = new WS(EXPECTED_CONNECTION_ENDPOINT.toString());

    new KeyphraseServiceWSClient(KEYPHRASE_ENDPOINT, BASE_URL);

    const client = await server.connected;

    expect(client).toBeDefined();
    expect(client.url).toEqual(EXPECTED_CONNECTION_ENDPOINT.toString());
});

test("returns no occurrences if no messages are sent from server during connection", async () => {
    const server = new WS(EXPECTED_CONNECTION_ENDPOINT.toString());
    const client = new KeyphraseServiceWSClient(KEYPHRASE_ENDPOINT, BASE_URL);
    await server.connected;

    const observable = client.observeKeyphraseResults();
    const resultsPromise = receiveObservableOutput(observable);
    server.close();

    const results = await resultsPromise;
    expect(results).toHaveLength(0);
});

test("returns a single occurrence if a single valid message is sent from the server during connection", async () => {
    const expectedOccurrence: PathnameOccurrences = {
        pathname: "/test",
        keyphrase: "wibble",
        occurrences: 5,
    };
    const server = new WS(EXPECTED_CONNECTION_ENDPOINT.toString());
    const client = new KeyphraseServiceWSClient(KEYPHRASE_ENDPOINT, BASE_URL);
    await server.connected;

    const observable = client.observeKeyphraseResults();
    const resultsPromise = receiveObservableOutput(observable);
    server.send(JSON.stringify(expectedOccurrence));
    server.close();

    const results = await resultsPromise;
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expectedOccurrence);
});

test.each([
    [
        "a single occurrence if a single valid message with an array containing a single occurrence",
        [
            {
                pathname: "/test",
                keyphrase: "wibble",
                occurrences: 5,
            },
        ],
    ],
    [
        "multiple occurrences if a single valid message with an array containing multiple occurrences",
        [
            {
                pathname: "/example",
                keyphrase: "wobble",
                occurrences: 16,
            },
        ],
    ],
])(
    "returns %s sent from the server during connection",
    async (message: string, expectedOccurrences: PathnameOccurrences[]) => {
        const server = new WS(EXPECTED_CONNECTION_ENDPOINT.toString());
        const client = new KeyphraseServiceWSClient(
            KEYPHRASE_ENDPOINT,
            BASE_URL
        );
        await server.connected;

        const observable = client.observeKeyphraseResults();
        const resultsPromise = receiveObservableOutput(observable);
        server.send(JSON.stringify(expectedOccurrences));
        server.close();

        const results = await resultsPromise;
        expect(results).toHaveLength(expectedOccurrences.length);
        expect(results).toEqual(expect.arrayContaining(expectedOccurrences));
    }
);
