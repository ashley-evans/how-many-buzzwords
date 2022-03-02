type KeyphraseResponse = {
    keyphrases: string[];
    keywords: string[];
};

interface KeyphraseProvider {
    findKeyphrases(text: string): Promise<KeyphraseResponse>;
}

export { KeyphraseProvider, KeyphraseResponse };
