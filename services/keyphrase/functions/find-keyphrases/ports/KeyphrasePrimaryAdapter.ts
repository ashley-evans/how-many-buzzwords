type KeyphrasesEvent = {
    baseURL?: string,
    pathname?: string
};

type KeyphrasesResponse = {
    success: boolean,
    baseURL?: string,
    pathname?: string
};

interface KeyphrasePrimaryAdapter {
    findKeyphrases(event: KeyphrasesEvent): Promise<KeyphrasesResponse>
}

export {
    KeyphrasesEvent,
    KeyphrasesResponse,
    KeyphrasePrimaryAdapter
};
