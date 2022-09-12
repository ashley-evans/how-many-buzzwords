import {
    Repository,
    URLsTableRepository,
} from "buzzword-crawl-urls-repository-library";

import {
    RecentCrawlEvent,
    RecentCrawlAdapterResponse,
} from "./ports/RecentCrawlAdapter";
import { RecentCrawlPort } from "./ports/RecentCrawlPort";
import RecentCrawlDomain from "./domain/RecentCrawlDomain";
import { RecentCrawlEventAdapter } from "./adapters/RecentCrawlEventAdapter";

function createRepository(): Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error("URLs Table Name has not been set.");
    }

    return new URLsTableRepository(process.env.TABLE_NAME);
}

function createRecentCrawlPort(repository: Repository): RecentCrawlPort {
    const maxAgeHours = Number(process.env.MAX_CRAWL_AGE_HOURS);
    if (isNaN(maxAgeHours) || maxAgeHours <= 0) {
        throw new Error("Max crawl age configuration is invalid.");
    }

    return new RecentCrawlDomain(repository, maxAgeHours);
}

async function handler(
    event: RecentCrawlEvent
): Promise<RecentCrawlAdapterResponse> {
    const repository = createRepository();
    const port = createRecentCrawlPort(repository);

    const adapter = new RecentCrawlEventAdapter(port);

    return adapter.hasCrawledRecently(event);
}

export { handler };
