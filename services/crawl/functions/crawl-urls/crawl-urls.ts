import ApifyProvider from "./adapters/ApifyProvider";
import SQSAdapter from "./adapters/EventAdapter";
import URLsTableRepository from "./adapters/URLsTableRepository";
import Crawl from "./domain/Crawl";
import CrawlProvider from "./ports/CrawlProvider";
import { CrawlEvent, CrawlResponse } from "./ports/PrimaryAdapter";
import Repository from "./ports/Repository";

function createCrawlProvider(): CrawlProvider {
    const maxCrawlDepth = Number(process.env.MAX_CRAWL_DEPTH);
    if (isNaN(maxCrawlDepth)) {
        throw new Error('Max Crawl Depth is not a number.');
    }

    const maxRequestsPerCrawl = Number(process.env.MAX_REQUESTS_PER_CRAWL);
    if (isNaN(maxRequestsPerCrawl)) {
        throw new Error('Max requests per crawl is not a number.');
    }

    return new ApifyProvider(
        maxCrawlDepth,
        maxRequestsPerCrawl
    );
}

function createRepostiory(): Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error('URLs Table Name has not been set.');
    }

    return new URLsTableRepository(process.env.TABLE_NAME);
}

const handler = async (event: CrawlEvent): Promise<CrawlResponse> => {
    const crawlProvider = createCrawlProvider();
    const repository = createRepostiory();

    const crawlDomain = new Crawl(
        crawlProvider,
        repository
    );

    const primaryAdapter = new SQSAdapter(crawlDomain);

    return await primaryAdapter.crawl(event);
};

export {
    handler
};
