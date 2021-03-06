import {
    WebSocketClientFactory,
    WebSocketClient,
} from "buzzword-aws-web-socket-client-library";
import {
    Repository,
    PathnameOccurrences,
} from "buzzword-aws-keyphrase-repository-library";

import { Connection, NewConnectionPort } from "../ports/NewConnectionPort";

class NewConnectionDomain implements NewConnectionPort {
    private clients: Map<URL, WebSocketClient>;

    constructor(
        private clientFactory: WebSocketClientFactory,
        private repository: Repository
    ) {
        this.clients = new Map();
    }

    provideCurrentKeyphrases(connection: Connection): Promise<boolean>;
    provideCurrentKeyphrases(connections: Connection[]): Promise<string[]>;

    async provideCurrentKeyphrases(
        connections: Connection | Connection[]
    ): Promise<boolean | string[]> {
        console.log(`Received connections: ${JSON.stringify(connections)}`);
        if (Array.isArray(connections)) {
            return await this.handleMultipleConnections(connections);
        }

        try {
            const occurrences = await this.repository.getKeyphrases(
                connections.baseURL
            );

            return await this.sendDataToConnection(connections, occurrences);
        } catch {
            return false;
        }
    }

    private async handleMultipleConnections(
        connections: Connection[]
    ): Promise<string[]> {
        let baseURLOccurrences: Map<string, PathnameOccurrences[]>;
        const uniqueConnections = this.removeDuplicateConnections(connections);
        try {
            baseURLOccurrences = await this.getAllKeyphraseOccurrences(
                uniqueConnections.map((connection) => connection.baseURL)
            );
        } catch {
            return uniqueConnections.map(
                (connection) => connection.connectionID
            );
        }

        const failures = await Promise.all(
            uniqueConnections.map(async (connection) => {
                try {
                    const data = baseURLOccurrences.get(connection.baseURL);
                    const sent = await this.sendDataToConnection(
                        connection,
                        data
                    );

                    if (!sent) {
                        return connection.connectionID;
                    }
                } catch {
                    return connection.connectionID;
                }
            })
        );

        const totalFailures: Set<string> = new Set();
        for (const failure of failures) {
            if (failure) {
                totalFailures.add(failure);
            }
        }

        return [...totalFailures];
    }

    private async sendDataToConnection(
        connection: Connection,
        occurrences?: PathnameOccurrences[]
    ): Promise<boolean> {
        if (occurrences && occurrences.length > 0) {
            const client = this.getClient(connection.callbackURL);
            return client.sendData(
                JSON.stringify(occurrences),
                connection.connectionID
            );
        }

        return true;
    }

    private async getAllKeyphraseOccurrences(
        baseURLs: string[]
    ): Promise<Map<string, PathnameOccurrences[]>> {
        const uniqueBaseURLs = [...new Set(baseURLs)];

        const result = new Map();
        for (const baseURL of uniqueBaseURLs) {
            const occurrences = await this.repository.getKeyphrases(baseURL);
            result.set(baseURL, occurrences);
        }

        return result;
    }

    private getClient(callbackURL: URL): WebSocketClient {
        const client = this.clients.get(callbackURL);
        if (client) {
            return client;
        }

        const newClient = this.clientFactory.createClient(callbackURL);
        this.clients.set(callbackURL, newClient);
        return newClient;
    }

    private removeDuplicateConnections(
        connections: Connection[]
    ): Connection[] {
        return [
            ...new Map(connections.map((v) => [v.connectionID, v])).values(),
        ];
    }
}

export default NewConnectionDomain;
