import { CrawlStatus } from "buzzword-aws-crawl-service-urls-repository-library";

type RecentCrawlResponse = {
    recentlyCrawled: boolean;
    status: CrawlStatus;
    crawlTime: Date;
};

interface RecentCrawlPort {
    hasCrawledRecently(baseURL: URL): Promise<RecentCrawlResponse | undefined>;
}

export { RecentCrawlResponse, RecentCrawlPort };
