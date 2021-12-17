interface CrawlPort {
    crawl(baseURL: URL, maxCrawlDepth?: number): Promise<boolean>
}

export default CrawlPort;
