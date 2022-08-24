type PathnameOccurrences = {
    pathname: string;
    keyphrase: string;
    occurrences: number;
    aggregated?: boolean;
};

type KeyphraseOccurrences = Omit<PathnameOccurrences, "pathname">;

interface Repository {
    empty(): Promise<boolean>;
    getOccurrences(
        baseURL: string,
        pathname: string,
        keyphrase: string
    ): Promise<KeyphraseOccurrences | undefined>;
    getOccurrences(
        baseURL: string,
        pathname: string
    ): Promise<KeyphraseOccurrences[]>;
    getOccurrences(baseURL: string): Promise<PathnameOccurrences[]>;
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
