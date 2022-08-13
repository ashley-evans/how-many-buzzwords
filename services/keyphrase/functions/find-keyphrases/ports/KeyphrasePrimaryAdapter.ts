type KeyphrasesEvent = {
    baseURL: string;
    pathname: string;
};

type KeyphrasesResponse = {
    keyphrases: string[];
};

interface KeyphrasePrimaryAdapter {
    findKeyphrases(
        event: Partial<KeyphrasesEvent>
    ): Promise<KeyphrasesResponse>;
}

export { KeyphrasesEvent, KeyphrasesResponse, KeyphrasePrimaryAdapter };
