import KeyphraseServiceWSClientFactory from "../KeyphraseServiceWSClientFactory";
import KeyphraseServiceWSClient from "../../KeyphraseServiceWSClient";

const KEYPHRASE_ENDPOINT = new URL("wss://www.example.com/$default");
const BASE_URL = new URL("https://www.example/");
const EXPECTED_CONNECTION_ENDPOINT = new URL(
    `${KEYPHRASE_ENDPOINT.toString()}?baseURL=${BASE_URL.toString()}`
);

const factory = new KeyphraseServiceWSClientFactory(KEYPHRASE_ENDPOINT);

test("creates an instance of websocket keyphrase service client", () => {
    const client = factory.createClient(BASE_URL);

    expect(client).toBeInstanceOf(KeyphraseServiceWSClient);
});

test("creates a client configured to listen to results from the provided base URL", () => {
    const client = factory.createClient(BASE_URL);

    const result = client.getConfiguredEndpoint();

    expect(result).toEqual(EXPECTED_CONNECTION_ENDPOINT);
});
