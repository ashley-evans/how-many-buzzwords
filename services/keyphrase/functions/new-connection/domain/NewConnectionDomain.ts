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
            throw "Not implemented.";
        }

        const occurrences = await this.repository.getKeyphrases(
            connections.baseURL
        );

        if (occurrences.length > 0) {
            const client = this.clientFactory.createClient(
                connections.callbackURL
            );
            await client.sendData(
                JSON.stringify(occurrences),
                connections.connectionID
            );
        }

        return true;
    }
}

export default NewConnectionDomain;
