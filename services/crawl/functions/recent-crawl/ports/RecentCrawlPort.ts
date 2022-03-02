type RecentCrawlResponse = {
    recentlyCrawled: boolean;
    crawlTime: Date;
};

interface RecentCrawlPort {
    hasCrawledRecently(baseURL: URL): Promise<RecentCrawlResponse | undefined>;
}

export { RecentCrawlResponse, RecentCrawlPort };
