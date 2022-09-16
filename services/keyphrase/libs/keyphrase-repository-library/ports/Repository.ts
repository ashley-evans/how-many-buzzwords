type SiteKeyphraseOccurrences = {
    baseURL: string;
    pathname: string;
    keyphrase: string;
    occurrences: number;
    aggregated?: boolean;
};

type PathnameOccurrences = Omit<SiteKeyphraseOccurrences, "baseURL">;
type KeyphraseOccurrences = Omit<PathnameOccurrences, "pathname">;
type SiteKeyphrase = Omit<
    SiteKeyphraseOccurrences,
    "occurrences" | "aggregated"
>;

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
    addOccurrencesToTotals(
        occurrences: SiteKeyphraseOccurrences | SiteKeyphraseOccurrences[]
    ): Promise<boolean>;
    getKeyphraseUsages(keyphrase: string): Promise<string[]>;
    setKeyphraseAggregated(
        keyphrases: SiteKeyphrase | SiteKeyphrase[]
    ): Promise<boolean>;
}

export {
    KeyphraseOccurrences,
    PathnameOccurrences,
    Repository,
    SiteKeyphraseOccurrences,
    SiteKeyphrase,
};
