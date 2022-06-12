import { Observable } from "rxjs";
import {
    PathnameOccurrences,
    KeyphraseServiceClient,
} from "./interfaces/KeyphraseServiceClient";

class KeyphraseServiceWSClient implements KeyphraseServiceClient {
    private socket: WebSocket;

    constructor(keyphraseServiceEndpoint: URL, baseURL: URL) {
        const connectionURL = `${keyphraseServiceEndpoint.toString()}?baseURL=${baseURL.toString()}`;
        this.socket = new WebSocket(connectionURL);
    }

    observeKeyphraseResults(): Observable<PathnameOccurrences> {
        throw new Error("Method not implemented.");
    }
}

export default KeyphraseServiceWSClient;
