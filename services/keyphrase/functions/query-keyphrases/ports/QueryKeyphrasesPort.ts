type PathKeyphraseOccurrences = {
    keyphrase: string;
    pathname: string;
    occurrences: number;
};

interface QueryKeyphrasesPort {
    queryKeyphrases(baseURL: string): Promise<PathKeyphraseOccurrences[]>;
}

export { PathKeyphraseOccurrences, QueryKeyphrasesPort };
