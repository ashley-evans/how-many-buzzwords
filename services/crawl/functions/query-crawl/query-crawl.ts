import { AppSyncResolverEvent } from "aws-lambda";

import { QueryCrawlsArgs, Crawl } from "../../schemas/schema";
import { CrawlStateMachineAdapter } from "./adapters/CrawlStateMachineAdapter";
import QueryCrawlAdapter from "./adapters/QueryCrawlAdapter";
import QueryCrawlDomain from "./domain/QueryCrawlDomain";
import CrawlRepositoryPort from "./ports/CrawlRepositoryPort";
import QueryCrawlPort from "./ports/QueryCrawlPort";

function createRepository(): CrawlRepositoryPort {
    const crawlStateMachineARN = process.env.CRAWL_STATE_MACHINE_ARN;
    if (!crawlStateMachineARN) {
        throw new Error("Crawl State Machine ARN has not been set.");
    }

    return new CrawlStateMachineAdapter(crawlStateMachineARN);
}

function createDomain(repository: CrawlRepositoryPort): QueryCrawlPort {
    const defaultLimit = process.env.DEFAULT_LIMIT;
    if (!defaultLimit) {
        throw new Error("Default limit has not been set.");
    }

    if (!Number.isInteger(defaultLimit)) {
        throw new Error("Provided Default limit is not an integer.");
    }

    return new QueryCrawlDomain(repository, parseInt(defaultLimit));
}

const repository = createRepository();
const domain = createDomain(repository);
const adapter = new QueryCrawlAdapter(domain);

async function handler(
    event: AppSyncResolverEvent<QueryCrawlsArgs>
): Promise<Crawl[]> {
    return adapter.handleQuery(event);
}

export { handler };
