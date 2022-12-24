import CrawlRepositoryPort from "../ports/CrawlRepositoryPort";
import QueryCrawlPort from "../ports/QueryCrawlPort";
import Crawl from "../types/Crawl";

class QueryCrawlDomain implements QueryCrawlPort {
    constructor(
        private repository: CrawlRepositoryPort,
        private defaultLimit: number
    ) {}

    async queryCrawl(limit?: number): Promise<Crawl[]> {
        if (limit !== undefined && limit <= 0) {
            throw new Error(
                "Invalid limit provided. Must be greater than zero"
            );
        }

        return this.repository.queryCrawl(limit || this.defaultLimit);
    }
}

export default QueryCrawlDomain;
