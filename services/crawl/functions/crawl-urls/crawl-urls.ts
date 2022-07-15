import {
    ContentRepository,
    S3Repository,
} from "buzzword-aws-crawl-content-repository-library";
import {
    Repository,
    URLsTableRepository,
} from "buzzword-aws-crawl-urls-repository-library";

import { ApifyProvider } from "./adapters/ApifyProvider";
import { CrawlEventAdapter } from "./adapters/CrawlEventAdapter";
import Crawl from "./domain/Crawl";
import { CrawlProvider } from "./ports/CrawlProvider";
import { CrawlEvent, CrawlResponse } from "./ports/PrimaryAdapter";

function createCrawlProvider(): CrawlProvider {
    const maxCrawlDepth = Number(process.env.MAX_CRAWL_DEPTH);
    if (isNaN(maxCrawlDepth)) {
        throw new Error("Max Crawl Depth is not a number.");
    }

    const maxRequests = Number(process.env.MAX_REQUESTS_PER_CRAWL);
    if (isNaN(maxRequests)) {
        throw new Error("Max requests per crawl is not a number.");
    }

    const minConcurrency = Number(process.env.MIN_CONCURRENCY);
    const maxConcurrency = Number(process.env.MAX_CONCURRENCY);
    const autoscaleInterval = Number(process.env.AUTOSCALE_INTERVAL);

    return new ApifyProvider({
        maxCrawlDepth,
        maxRequests,
        minConcurrency: isNaN(minConcurrency) ? undefined : minConcurrency,
        maxConcurrency: isNaN(maxConcurrency) ? undefined : maxConcurrency,
        autoScaleInterval: isNaN(autoscaleInterval)
            ? undefined
            : autoscaleInterval,
    });
}

function createRepostiory(): Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error("URLs Table Name has not been set.");
    }

    return new URLsTableRepository(process.env.TABLE_NAME);
}

function createContentRepository(): ContentRepository {
    if (!process.env.CONTENT_BUCKET_NAME) {
        throw new Error("Content Bucket Name has not been set.");
    }

    return new S3Repository(process.env.CONTENT_BUCKET_NAME);
}

const handler = async (event: CrawlEvent): Promise<CrawlResponse> => {
    const crawlProvider = createCrawlProvider();
    const urlRepository = createRepostiory();
    const contentRepository = createContentRepository();

    const crawlDomain = new Crawl(
        crawlProvider,
        urlRepository,
        contentRepository
    );

    const primaryAdapter = new CrawlEventAdapter(crawlDomain);

    return await primaryAdapter.crawl(event);
};

export { handler };
