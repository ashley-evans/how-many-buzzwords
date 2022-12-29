import Crawl from "../types/Crawl";

interface QueryCrawlPort {
    queryCrawl(limit?: number): Promise<Crawl[]>;
}

export default QueryCrawlPort;
