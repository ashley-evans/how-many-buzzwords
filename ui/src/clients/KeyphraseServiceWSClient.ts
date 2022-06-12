import { Observable, Subject } from "rxjs";
import {
    PathnameOccurrences,
    KeyphraseServiceClient,
} from "./interfaces/KeyphraseServiceClient";

class KeyphraseServiceWSClient implements KeyphraseServiceClient {
    private socket: WebSocket;
    private occurrences: Subject<PathnameOccurrences>;

    constructor(keyphraseServiceEndpoint: URL, baseURL: URL) {
        const connectionURL = `${keyphraseServiceEndpoint.toString()}?baseURL=${baseURL.toString()}`;
        this.socket = new WebSocket(connectionURL);
        this.occurrences = new Subject();
    }

    observeKeyphraseResults(): Observable<PathnameOccurrences> {
        this.socket.addEventListener("close", () => {
            this.occurrences.complete();
        });
        return this.occurrences.asObservable();
    }
}

export default KeyphraseServiceWSClient;
