import { CrawlStatus } from "buzzword-crawl-urls-repository-library";

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
