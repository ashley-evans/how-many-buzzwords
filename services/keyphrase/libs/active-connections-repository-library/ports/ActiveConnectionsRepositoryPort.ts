type Connection = {
    connectionID: string;
    callbackURL: URL;
};

interface ActiveConnectionsRepositoryPort {
    getListeningConnections(baseURL: string): Promise<Connection[]>;
    storeConnection(connection: Connection, baseURL: string): Promise<boolean>;
    deleteConnection(connectionID: string): Promise<boolean>;
}

export { ActiveConnectionsRepositoryPort, Connection };
