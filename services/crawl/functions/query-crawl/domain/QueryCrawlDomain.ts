import CrawlRepositoryPort from "../ports/CrawlRepositoryPort";
import QueryCrawlPort from "../ports/QueryCrawlPort";
import Crawl from "../types/Crawl";
import SortOrder from "../types/SortOrder";

class QueryCrawlDomain implements QueryCrawlPort {
    constructor(
        private repository: CrawlRepositoryPort,
        private defaultLimit: number,
        private defaultSortOrder: SortOrder
    ) {}

    async queryCrawl(
        limit?: number,
        dateSortOrder?: SortOrder
    ): Promise<Crawl[]> {
        if (limit !== undefined && limit <= 0) {
            throw new Error(
                "Invalid limit provided. Must be greater than zero"
            );
        }

        return this.repository.queryCrawl(
            limit || this.defaultLimit,
            dateSortOrder === undefined ? this.defaultSortOrder : dateSortOrder
        );
    }
}

export default QueryCrawlDomain;
