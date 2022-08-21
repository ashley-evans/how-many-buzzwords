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
    deleteKeyphrases(baseURL: string, skPrefix?: string): Promise<boolean>;
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
    deleteTotals(baseURL?: string): Promise<boolean>;
    getTotals(baseURL: string): Promise<KeyphraseOccurrences[]>;
    storeTotals(
        totals: KeyphraseOccurrences | KeyphraseOccurrences[],
        baseURL?: string
    ): Promise<boolean>;
    getKeyphraseUsages(keyphrase: string): Promise<string[]>;
}

export { KeyphraseOccurrences, PathnameOccurrences, Repository };
