interface CrawlClient {
    getContent(url: URL): Promise<string>;
}

export default CrawlClient;
