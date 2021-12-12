interface CrawlProvider {
    crawl(baseURL: URL): Promise<URL[]>
}

export default CrawlProvider;
