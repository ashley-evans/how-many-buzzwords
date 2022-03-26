type KeyphraseOccurrences = {
    keyphrase: string;
    occurrences: number;
};

type PathnameOccurrences = {
    pathname: string;
    keyphrase: string;
    occurrences: number;
};

interface Repository {
    deleteKeyphrases(baseURL: string): Promise<boolean>;
    getKeyphrases(baseURL: string): Promise<PathnameOccurrences[]>;
    getPathKeyphrases(
        baseURL: string,
        pathname: string
    ): Promise<KeyphraseOccurrences[]>;
    storeKeyphrases(
        baseURL: string,
        pathname: string,
        occurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
    ): Promise<boolean>;
}

export { KeyphraseOccurrences, PathnameOccurrences, Repository };
