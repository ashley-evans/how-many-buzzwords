import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";
import { AWSWebSocketClientFactory } from "buzzword-keyphrase-web-socket-client-library";
import {
    ActiveConnectionsRepository,
    ActiveConnectionsRepositoryPort,
} from "buzzword-keyphrase-active-connections-repository-library";

import UpdateConnectionsDomain from "./domain/UpdateConnectionsDomain";
import UpdateConnectionsStreamAdapter from "./adapters/UpdateConnectionsStreamAdapter";

function createRepository(): ActiveConnectionsRepositoryPort {
    if (!process.env.TABLE_NAME) {
        throw new Error("Active Connections table name has not been set.");
    }

    return new ActiveConnectionsRepository(process.env.TABLE_NAME);
}

const repository = createRepository();
const factory = new AWSWebSocketClientFactory();
const domain = new UpdateConnectionsDomain(factory, repository);
const adapter = new UpdateConnectionsStreamAdapter(domain);

async function handler(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
    return adapter.handleEvent(event);
}

export { handler };
