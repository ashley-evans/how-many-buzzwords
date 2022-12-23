import Crawl from "../types/Crawl";
import SortOrder from "../types/SortOrder";

interface CrawlRepositoryPort {
    queryCrawl(limit: number, dateSortOrder: SortOrder): Promise<Crawl[]>;
}

export default CrawlRepositoryPort;
