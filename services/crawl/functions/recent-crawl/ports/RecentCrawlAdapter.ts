import { CrawlStatus } from "buzzword-aws-crawl-service-urls-repository-library";

type RecentCrawlEvent = {
    url?: string;
};

type RecentCrawlAdapterResponse = {
    url: string;
    recentlyCrawled: boolean;
    status?: CrawlStatus;
    crawlTime?: Date;
};

interface RecentCrawlAdapter {
    hasCrawledRecently(
        event: RecentCrawlEvent
    ): Promise<RecentCrawlAdapterResponse>;
}

export { RecentCrawlEvent, RecentCrawlAdapterResponse, RecentCrawlAdapter };
