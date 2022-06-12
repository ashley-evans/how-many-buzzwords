import { KeyphraseServiceClient } from "../interfaces/KeyphraseServiceClient";
import KeyphraseServiceClientFactory from "../interfaces/KeyphraseServiceClientFactory";
import KeyphraseServiceWSClient from "../KeyphraseServiceWSClient";

class KeyphraseServiceWSClientFactory implements KeyphraseServiceClientFactory {
    constructor(private keyphraseServiceEndpoint: URL) {}

    createClient(baseURL: URL): KeyphraseServiceClient {
        return new KeyphraseServiceWSClient(
            this.keyphraseServiceEndpoint,
            baseURL
        );
    }
}

export default KeyphraseServiceWSClientFactory;
