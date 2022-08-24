type PathnameOccurrences = {
    pathname: string;
    keyphrase: string;
    occurrences: number;
    aggregated?: boolean;
};

type KeyphraseOccurrences = Omit<PathnameOccurrences, "pathname">;

interface Repository {
    empty(): Promise<boolean>;
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
    getTotals(baseURL?: string): Promise<KeyphraseOccurrences[]>;
    addTotals(
        baseURL: string,
        totals: KeyphraseOccurrences | KeyphraseOccurrences[]
    ): Promise<boolean>;
    getKeyphraseUsages(keyphrase: string): Promise<string[]>;
}

export { KeyphraseOccurrences, PathnameOccurrences, Repository };
