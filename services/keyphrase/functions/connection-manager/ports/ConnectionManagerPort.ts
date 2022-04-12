interface ConnectionManagerPort {
    storeConnection(
        connectionID: string,
        callbackURL: URL,
        baseURL: URL
    ): Promise<boolean>;
    deleteConnection(connectionID: string): Promise<boolean>;
}

export default ConnectionManagerPort;
