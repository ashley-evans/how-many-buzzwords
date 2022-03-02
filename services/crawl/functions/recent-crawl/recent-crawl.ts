import { JSONSchemaType } from "ajv";
import {
    Repository,
    URLsTableRepository,
} from "buzzword-aws-crawl-urls-repository-library";
import { ObjectValidator, AjvValidator } from "buzzword-aws-crawl-common";

import {
    RecentCrawlEvent,
    RecentCrawlAdapterResponse,
} from "./ports/RecentCrawlAdapter";
import { RecentCrawlPort } from "./ports/RecentCrawlPort";
import RecentCrawlDomain from "./domain/RecentCrawlDomain";
import {
    RecentCrawlEventAdapter,
    ValidRecentCrawlEvent,
} from "./adapters/RecentCrawlEventAdapter";

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

function createValidator(): ObjectValidator<ValidRecentCrawlEvent> {
    const schema: JSONSchemaType<ValidRecentCrawlEvent> = {
        type: "object",
        properties: {
            url: {
                type: "string",
            },
        },
        required: ["url"],
    };

    return new AjvValidator<ValidRecentCrawlEvent>(schema);
}

async function handler(
    event: RecentCrawlEvent
): Promise<RecentCrawlAdapterResponse> {
    const repository = createRepository();
    const port = createRecentCrawlPort(repository);
    const validator = createValidator();

    const adapter = new RecentCrawlEventAdapter(port, validator);

    return adapter.hasCrawledRecently(event);
}

export { handler };
