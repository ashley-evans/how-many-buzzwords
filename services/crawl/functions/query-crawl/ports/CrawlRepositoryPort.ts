import Crawl from "../types/Crawl";

interface CrawlRepositoryPort {
    queryCrawl(limit: number): Promise<Crawl[]>;
}

export default CrawlRepositoryPort;
