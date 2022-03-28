interface ActiveConnectionsRepository {
    storeConnection(
        connectionID: string,
        callbackURL: URL,
        baseURL: string
    ): Promise<boolean>;
}

export default ActiveConnectionsRepository;
