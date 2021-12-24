interface KeyphraseRepository {
    storeKeyphrases(url: string, keyphrases: string[]): Promise<boolean>;
}

export default KeyphraseRepository;
