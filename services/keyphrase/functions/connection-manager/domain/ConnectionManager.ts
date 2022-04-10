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

    async deleteConnection(connectionID: string): Promise<boolean> {
        try {
            return await this.repository.deleteConnection(connectionID);
        } catch {
            return false;
        }
    }
}

export default ConnectionManager;
