interface KeyphrasesPort {
    findKeyphrases(url: URL): Promise<boolean>;
}

export default KeyphrasesPort;
