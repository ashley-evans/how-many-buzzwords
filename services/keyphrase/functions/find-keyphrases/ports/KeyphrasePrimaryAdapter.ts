type KeyphrasesEvent = {
    baseURL: string;
    pathname: string;
};

interface KeyphrasePrimaryAdapter {
    findKeyphrases(event: Partial<KeyphrasesEvent>): Promise<string[]>;
}

export { KeyphrasesEvent, KeyphrasePrimaryAdapter };
