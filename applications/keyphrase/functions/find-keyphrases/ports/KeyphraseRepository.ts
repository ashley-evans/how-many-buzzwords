type KeyphraseOccurrences = {
    keyphrase: string,
    occurrences: number
};

interface KeyphraseRepository {
    getOccurrences(url: string): Promise<KeyphraseOccurrences[]>;

    storeOccurrences(
        url: string,
        keyphraseOccurences: KeyphraseOccurrences[]
    ): Promise<boolean>;
}

export {
    KeyphraseOccurrences,
    KeyphraseRepository
};
