import {
    CrawlClient,
    CrawlHTTPClient,
} from "@ashley-evans/buzzword-crawl-client";
import {
    TextRepository,
    TextS3Repository,
} from "buzzword-aws-keyphrase-service-text-repository-library";

import {
    ScrapeURLEvent,
    ScrapeURLResponse,
} from "./ports/ScrapeURLPrimaryAdapter";
import ScrapeURLEventAdapter from "./adapters/ScrapeURLEventAdapter";
import ScrapeURLDomain from "./domain/ScrapeURLDomain";
import HTMLParser from "./adapters/HTMLParser";

function createCrawlClient(): CrawlClient {
    if (!process.env.CRAWL_SERVICE_REST_ENDPOINT) {
        throw new Error("Crawl Service REST endpoint has not been set.");
    }

    try {
        const endpoint = new URL(process.env.CRAWL_SERVICE_REST_ENDPOINT);
        return new CrawlHTTPClient(endpoint);
    } catch {
        throw new Error("Crawl Service REST endpoint is invalid.");
    }
}

function createRepository(): TextRepository {
    if (!process.env.PARSED_CONTENT_S3_BUCKET_NAME) {
        throw new Error("Parsed Content S3 bucket has not been set.");
    }

    return new TextS3Repository(process.env.PARSED_CONTENT_S3_BUCKET_NAME);
}

const crawlClient = createCrawlClient();
const parser = new HTMLParser();
const repository = createRepository();
const domain = new ScrapeURLDomain(crawlClient, parser, repository);
const adapter = new ScrapeURLEventAdapter(domain);

async function handler(event: ScrapeURLEvent): Promise<ScrapeURLResponse> {
    return adapter.handleEvent(event);
}

export { handler };
