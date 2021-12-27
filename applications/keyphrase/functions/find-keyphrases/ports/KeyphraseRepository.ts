type KeyphraseOccurrences = {
    keyphrase: string,
    occurrences: number
};

interface KeyphraseRepository {
    storeOccurrences(
        url: string,
        keyphraseOccurences: KeyphraseOccurrences[]
    ): Promise<boolean>;
}

export {
    KeyphraseOccurrences,
    KeyphraseRepository
};
