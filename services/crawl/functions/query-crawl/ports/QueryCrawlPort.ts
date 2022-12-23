import SortOrder from "../types/SortOrder";
import Crawl from "../types/Crawl";

interface QueryCrawlPort {
    queryCrawl(limit?: number, dateSortOrder?: SortOrder): Promise<Crawl[]>;
}

export default QueryCrawlPort;
