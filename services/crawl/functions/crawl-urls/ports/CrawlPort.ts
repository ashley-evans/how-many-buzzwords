type CrawlerResponse = {
    success: boolean;
    pathnames?: string[];
};

interface CrawlPort {
    crawl(baseURL: URL, maxCrawlDepth?: number): Promise<CrawlerResponse>;
}

export { CrawlerResponse, CrawlPort };
