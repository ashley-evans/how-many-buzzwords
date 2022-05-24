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

        const failureOccurrences: BaseURLOccurrences[][] = await Promise.all(
            groupedOccurrences.map(async (group) => {
                try {
                    const connections =
                        await this.repository.getListeningConnections(
                            group.baseURL
                        );

                    await Promise.all(
                        connections.map(async (connection) => {
                            const client = this.getClient(
                                connection.callbackURL
                            );
                            await client.sendData(
                                JSON.stringify(group.occurrences),
                                connection.connectionID
                            );
                        })
                    );

                    return [];
                } catch {
                    return this.mapOccurrencesToBaseURL(
                        group.baseURL,
                        group.occurrences
                    );
                }
            })
        );

        return failureOccurrences.flat();
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

    private mapOccurrencesToBaseURL(
        baseURL: string,
        occurrences: PathnameOccurrences[]
    ): BaseURLOccurrences[] {
        return occurrences.map((occurrence) => ({
            baseURL,
            pathname: occurrence.pathname,
            keyphrase: occurrence.keyphrase,
            occurrences: occurrence.occurrences,
        }));
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
