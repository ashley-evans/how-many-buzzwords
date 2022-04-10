import {
    ActiveConnectionsRepositoryPort,
    Connection,
} from "buzzword-aws-active-connections-repository-library";

import ConnectionManagerPort from "../ports/ConnectionManagerPort";

class ConnectionManager implements ConnectionManagerPort {
    constructor(private repository: ActiveConnectionsRepositoryPort) {}

    async storeConnection(
        connectionID: string,
        callbackURL: URL,
        baseURL: URL
    ): Promise<boolean> {
        const connection: Connection = {
            connectionID,
            callbackURL,
        };

        try {
            return await this.repository.storeConnection(
                connection,
                baseURL.hostname
            );
        } catch {
            return false;
        }
    }

    deleteConnection(connectionID: string): Promise<boolean> {
        throw new Error("Method not implemented." + connectionID);
    }
}

export default ConnectionManager;
