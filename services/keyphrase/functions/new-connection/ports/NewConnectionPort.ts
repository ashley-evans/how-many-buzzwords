type Connection = {
    connectionID: string;
    callbackURL: URL;
    baseURL: string;
};

interface NewConnectionPort {
    provideCurrentKeyphrases(connection: Connection): Promise<boolean>;
    provideCurrentKeyphrases(connectionIDs: Connection[]): Promise<string[]>;
}

export { Connection, NewConnectionPort };
