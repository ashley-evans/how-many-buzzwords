import { chain } from "lodash";
import {
    WebSocketClient,
    WebSocketClientFactory,
} from "buzzword-aws-web-socket-client-library";
import { ActiveConnectionsRepositoryPort } from "buzzword-aws-active-connections-repository-library";
import { PathnameOccurrences } from "buzzword-aws-keyphrase-repository-library";

import {
    BaseURLOccurrences,
    UpdateConnectionsPort,
} from "../ports/UpdateConnectionsPort";

class UpdateConnectionsDomain implements UpdateConnectionsPort {
    private clients: Map<URL, WebSocketClient>;

    constructor(
        private factory: WebSocketClientFactory,
        private repository: ActiveConnectionsRepositoryPort
    ) {
        this.clients = new Map();
    }

    async updateExistingConnections(
        occurrences: BaseURLOccurrences[]
    ): Promise<BaseURLOccurrences[]> {
        const groupedOccurrences = this.groupOccurrences(occurrences);

        for (const occurrrenceGroup of groupedOccurrences) {
            const connections = await this.repository.getListeningConnections(
                occurrrenceGroup.baseURL
            );

            for (const connection of connections) {
                const client = this.getClient(connection.callbackURL);
                await client.sendData(
                    JSON.stringify(occurrrenceGroup.occurrences),
                    connection.connectionID
                );
            }
        }

        return [];
    }

    private groupOccurrences(
        occurrences: BaseURLOccurrences[]
    ): { baseURL: string; occurrences: PathnameOccurrences[] }[] {
        return chain(occurrences)
            .groupBy((occurrence) => occurrence.baseURL)
            .map((groupedOccurrences, baseURL) => ({
                baseURL,
                occurrences: groupedOccurrences.map((occurrence) => {
                    const mapped: PathnameOccurrences = {
                        pathname: occurrence.pathname,
                        keyphrase: occurrence.keyphrase,
                        occurrences: occurrence.occurrences,
                    };

                    return mapped;
                }),
            }))
            .value();
    }

    private getClient(callbackURL: URL): WebSocketClient {
        const client = this.clients.get(callbackURL);
        if (client) {
            return client;
        }

        const newClient = this.factory.createClient(callbackURL);
        this.clients.set(callbackURL, newClient);
        return newClient;
    }
}

export default UpdateConnectionsDomain;
