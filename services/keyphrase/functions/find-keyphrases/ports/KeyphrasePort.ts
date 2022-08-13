interface KeyphrasesPort {
    findKeyphrases(url: URL): Promise<Set<string>>;
}

export default KeyphrasesPort;
