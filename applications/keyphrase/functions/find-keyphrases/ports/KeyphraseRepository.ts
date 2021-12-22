interface KeyphraseRepository {
    storeKeyphrases(url: URL, keyphrases: string[]): Promise<boolean>;
}

export default KeyphraseRepository;
