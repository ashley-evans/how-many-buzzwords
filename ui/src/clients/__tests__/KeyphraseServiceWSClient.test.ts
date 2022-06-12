import WS from "jest-websocket-mock";

import KeyphraseServiceWSClient from "../KeyphraseServiceWSClient";

const KEYPHRASE_ENDPOINT = new URL("wss://www.example.com/$default");
const BASE_URL = new URL("https://www.example/");
const EXPECTED_CONNECTION_ENDPOINT = new URL(
    `${KEYPHRASE_ENDPOINT.toString()}?baseURL=${BASE_URL.toString()}`
);

beforeEach(() => {
    WS.clean();
});

test("client connects to provided web socket server on creation", async () => {
    const server = new WS(EXPECTED_CONNECTION_ENDPOINT.toString());

    new KeyphraseServiceWSClient(KEYPHRASE_ENDPOINT, BASE_URL);

    const client = await server.connected;

    expect(client).toBeDefined();
    expect(client.url).toEqual(EXPECTED_CONNECTION_ENDPOINT.toString());
});
