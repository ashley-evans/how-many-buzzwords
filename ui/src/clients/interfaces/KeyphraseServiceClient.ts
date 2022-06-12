import { Observable } from "rxjs";

type PathnameOccurrences = {
    pathname: string;
    keyphrase: string;
    occurrences: number;
};

interface KeyphraseServiceClient {
    observeKeyphraseResults(): Observable<PathnameOccurrences>;
    disconnect(): void;
    getConfiguredEndpoint(): URL;
}

export type { PathnameOccurrences, KeyphraseServiceClient };
