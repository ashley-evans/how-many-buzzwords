import { AppSyncResolverEvent } from "aws-lambda";
import {
    Repository,
    URLsTableRepository,
} from "buzzword-aws-crawl-urls-repository-library";

import GetURLsDomain from "./domain/GetURLsDomain";
import GetURLsAdapter from "./adapters/GetURLsAdapter";
import { QueryUrlsArgs, Url } from "../../../../schemas/schema";

function createRepository(): Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error("URLs Table Name has not been set.");
    }

    return new URLsTableRepository(process.env.TABLE_NAME);
}

const repository = createRepository();
const port = new GetURLsDomain(repository);
const adapter = new GetURLsAdapter(port);

async function handler(
    event: AppSyncResolverEvent<QueryUrlsArgs>
): Promise<Url | undefined> {
    return adapter.handleQuery(event);
}

export { handler };
