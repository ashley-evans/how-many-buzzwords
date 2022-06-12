import { KeyphraseServiceClient } from "./KeyphraseServiceClient";

interface KeyphraseServiceClientFactory {
    createClient(baseURL: URL): KeyphraseServiceClient;
}

export default KeyphraseServiceClientFactory;
