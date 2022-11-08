type KeyphraseOccurrences = {
    keyphrase: string;
    occurrences: number;
};

type PathKeyphraseOccurrences = KeyphraseOccurrences & {
    pathname: string;
};

interface QueryKeyphrasesPort {
    queryKeyphrases(
        baseURL: string,
        pathname?: string
    ): Promise<PathKeyphraseOccurrences[] | KeyphraseOccurrences[]>;
}

export { KeyphraseOccurrences, PathKeyphraseOccurrences, QueryKeyphrasesPort };
