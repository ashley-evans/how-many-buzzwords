import {
    Repository,
    URLsTableRepository,
} from "buzzword-aws-crawl-urls-repository-library";

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

const repository = createRepository();
const domain = new UpdateStatusDomain(repository);
const adapter = new UpdateStatusEventAdapter(domain);

async function handler(
    event: UpdateStatusEvent
): Promise<UpdateStatusResponse> {
    return adapter.handleEvent(event);
}

export { handler };
