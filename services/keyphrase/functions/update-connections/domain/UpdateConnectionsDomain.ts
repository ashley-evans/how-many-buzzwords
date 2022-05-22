import { WebSocketClientFactory } from "buzzword-aws-web-socket-client-library";
import { ActiveConnectionsRepositoryPort } from "buzzword-aws-active-connections-repository-library";

import {
    BaseURLOccurrences,
    UpdateConnectionsPort,
} from "../ports/UpdateConnectionsPort";

class UpdateConnectionsDomain implements UpdateConnectionsPort {
    constructor(
        private factory: WebSocketClientFactory,
        private repository: ActiveConnectionsRepositoryPort
    ) {}

    async updateExistingConnections(
        occurrences: BaseURLOccurrences[]
    ): Promise<BaseURLOccurrences[]> {
        const uniqueBaseURLs = [
            ...new Set(occurrences.map((occurrence) => occurrence.baseURL)),
        ];

        for (const baseURL of uniqueBaseURLs) {
            this.repository.getListeningConnections(baseURL);
        }

        return [];
    }
}

export default UpdateConnectionsDomain;
