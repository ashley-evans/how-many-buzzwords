interface CountOccurrencesPort {
    countOccurrences(url: URL, keyphrases: Set<string>): Promise<boolean>;
}

export default CountOccurrencesPort;
