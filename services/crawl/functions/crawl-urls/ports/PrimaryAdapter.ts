type CrawlEvent = {
    url?: string,
    depth?: string
};

type CrawlResponse = {
    success: boolean
};

interface PrimaryAdapter {
    crawl(event: CrawlEvent): Promise<CrawlResponse>
}

export {
    CrawlEvent,
    CrawlResponse,
    PrimaryAdapter
};
