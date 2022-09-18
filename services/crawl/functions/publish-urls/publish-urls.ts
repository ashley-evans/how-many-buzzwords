import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";
import {
    EventClient,
    EventBridgeClient,
} from "buzzword-crawl-event-client-library";

import PublishURLsStreamAdapter from "./adapters/PublishURLsStreamAdapter";

function createEventClient(): EventClient {
    if (!process.env.EVENT_BUS_NAME) {
        throw new Error("Crawl event bus name has not been set.");
    }

    return new EventBridgeClient(process.env.EVENT_BUS_NAME);
}

const client = createEventClient();
const adapter = new PublishURLsStreamAdapter(client);

async function handler(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
    return adapter.handleEvent(event);
}

export { handler };
