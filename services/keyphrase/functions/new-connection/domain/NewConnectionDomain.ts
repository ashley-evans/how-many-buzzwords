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
        if (Array.isArray(connections)) {
            let baseURLOccurrences: Map<string, PathnameOccurrences[]>;
            try {
                baseURLOccurrences = await this.getAllKeyphraseOccurrences(
                    connections.map((connection) => connection.baseURL)
                );
            } catch {
                return connections.map((connection) => connection.connectionID);
            }

            const totalFailures: Set<string> = new Set();
            for (const connection of connections) {
                try {
                    const data = baseURLOccurrences.get(connection.baseURL);
                    if (data && data.length > 0) {
                        const client = this.getClient(connection.callbackURL);
                        const sent = await client.sendData(
                            JSON.stringify(data),
                            connection.connectionID
                        );
                        if (!sent) {
                            totalFailures.add(connection.connectionID);
                        }
                    }
                } catch {
                    totalFailures.add(connection.connectionID);
                }
            }

            return [...totalFailures];
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
}

export default NewConnectionDomain;
