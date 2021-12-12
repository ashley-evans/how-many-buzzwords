interface CrawlPort {
    crawl(baseURL: URL): Promise<boolean>
}

export default CrawlPort;
