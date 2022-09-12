import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";
import { AWSWebSocketClientFactory } from "buzzword-keyphrase-web-socket-client-library";
import {
    Repository,
    KeyphraseRepository,
} from "buzzword-keyphrase-keyphrase-repository-library";

import NewConnectionDomain from "./domain/NewConnectionDomain";
import NewConnectionStreamAdapter from "./adapters/NewConnectionStreamAdapter";

function createRepository(): Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error("Keyphrase table name has not been set.");
    }

    return new KeyphraseRepository(process.env.TABLE_NAME);
}

const repository = createRepository();
const factory = new AWSWebSocketClientFactory();
const domain = new NewConnectionDomain(factory, repository);
const adapter = new NewConnectionStreamAdapter(domain);

async function handler(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
    return adapter.handleEvent(event);
}

export { handler };
