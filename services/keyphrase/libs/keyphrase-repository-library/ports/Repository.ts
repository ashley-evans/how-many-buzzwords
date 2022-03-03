type KeyphraseOccurrences = {
    keyphrase: string;
    occurrences: number;
};

interface Repository {
    deleteKeyphrases(baseURL: string): Promise<boolean>;
    getKeyphrases(baseURL: string): Promise<KeyphraseOccurrences[]>;
    storeKeyphrase(
        baseURL: string,
        occurrences: KeyphraseOccurrences
    ): Promise<boolean>;
}

export { KeyphraseOccurrences, Repository };
