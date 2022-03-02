type CrawlEvent = {
    url?: string;
    depth?: string;
};

type CrawlResponse = {
    success: boolean;
    baseURL?: string;
    pathnames?: string[];
};

interface PrimaryAdapter {
    crawl(event: CrawlEvent): Promise<CrawlResponse>;
}

export { CrawlEvent, CrawlResponse, PrimaryAdapter };
