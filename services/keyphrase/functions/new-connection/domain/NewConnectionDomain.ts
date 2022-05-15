import { WebSocketClientFactory } from "buzzword-aws-web-socket-client-library";
import { Repository } from "buzzword-aws-keyphrase-repository-library";

import { Connection, NewConnectionPort } from "../ports/NewConnectionPort";

class NewConnectionDomain implements NewConnectionPort {
    constructor(
        private clientFactory: WebSocketClientFactory,
        private repository: Repository
    ) {}

    provideCurrentKeyphrases(connection: Connection): Promise<boolean>;
    provideCurrentKeyphrases(connections: Connection[]): Promise<string[]>;

    async provideCurrentKeyphrases(
        connections: Connection | Connection[]
    ): Promise<boolean | string[]> {
        if (Array.isArray(connections)) {
            const connectionIDs = connections.map(
                (connection) => connection.connectionID
            );

            let failures: string[];
            try {
                const occurrences = await this.repository.getKeyphrases(
                    connections[0].baseURL
                );

                if (occurrences.length > 0) {
                    const client = this.clientFactory.createClient(
                        connections[0].callbackURL
                    );

                    failures = await client.sendData(
                        JSON.stringify(occurrences),
                        connectionIDs
                    );
                } else {
                    return [];
                }
            } catch {
                return connections.map((connection) => connection.connectionID);
            }

            const allIDsKnown = failures.every((id) =>
                connectionIDs.includes(id)
            );
            if (!allIDsKnown) {
                throw new Error(
                    `An unknown ID was returned from the web socket client. Expected: ${connectionIDs}. Returned: ${failures}`
                );
            }

            return failures;
        }

        try {
            const occurrences = await this.repository.getKeyphrases(
                connections.baseURL
            );

            if (occurrences.length > 0) {
                const client = this.clientFactory.createClient(
                    connections.callbackURL
                );

                return await client.sendData(
                    JSON.stringify(occurrences),
                    connections.connectionID
                );
            }

            return true;
        } catch {
            return false;
        }
    }
}

export default NewConnectionDomain;
