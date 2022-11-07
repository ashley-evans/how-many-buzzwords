type KeyphraseOccurrences = {
    keyphrase: string;
    occurrences: number;
};

type PathKeyphraseOccurrences = KeyphraseOccurrences & {
    pathname: string;
};

interface QueryKeyphrasesPort {
    queryKeyphrases(baseURL: string): Promise<PathKeyphraseOccurrences[]>;
    queryKeyphrases(
        baseURL: string,
        pathname: string
    ): Promise<KeyphraseOccurrences[]>;
}

export { KeyphraseOccurrences, PathKeyphraseOccurrences, QueryKeyphrasesPort };
