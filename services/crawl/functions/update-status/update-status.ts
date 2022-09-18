import {
    Repository,
    URLsTableRepository,
} from "buzzword-crawl-urls-repository-library";
import {
    EventClient,
    EventBridgeClient,
} from "buzzword-crawl-event-client-library";

import {
    UpdateStatusEvent,
    UpdateStatusResponse,
} from "./ports/UpdateStatusPrimaryAdapter";
import UpdateStatusDomain from "./domain/UpdateStatusDomain";
import UpdateStatusEventAdapter from "./adapters/UpdateStatusEventAdapter";

function createRepository(): Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error("URLs table name has not been set.");
    }

    return new URLsTableRepository(process.env.TABLE_NAME);
}

function createEventClient(): EventClient {
    if (!process.env.EVENT_BUS_NAME) {
        throw new Error("Crawl event bus name has not been set.");
    }

    return new EventBridgeClient(process.env.EVENT_BUS_NAME);
}

const repository = createRepository();
const client = createEventClient();
const domain = new UpdateStatusDomain(repository, client);
const adapter = new UpdateStatusEventAdapter(domain);

async function handler(
    event: UpdateStatusEvent
): Promise<UpdateStatusResponse> {
    return adapter.handleEvent(event);
}

export { handler };
