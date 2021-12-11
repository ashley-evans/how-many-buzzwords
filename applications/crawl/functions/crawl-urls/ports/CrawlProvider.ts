interface CrawlProvider {
    crawl(baseURL: URL): URL[]
}

export default CrawlProvider;
