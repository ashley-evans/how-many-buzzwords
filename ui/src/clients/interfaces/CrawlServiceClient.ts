interface CrawlServiceClient {
    crawl(baseURL: URL): Promise<boolean>;
}

export default CrawlServiceClient;
