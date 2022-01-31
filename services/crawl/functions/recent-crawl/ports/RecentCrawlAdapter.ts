type RecentCrawlEvent = {
    url?: string;
};

type RecentCrawlAdapterResponse = {
    baseURL?: string,
    recentlyCrawled: boolean,
    crawlTime: Date
}

interface RecentCrawlAdapter {
    hasCrawledRecently(
        event: RecentCrawlEvent
    ): Promise<RecentCrawlAdapterResponse>
}

export {
    RecentCrawlEvent,
    RecentCrawlAdapterResponse,
    RecentCrawlAdapter
};
