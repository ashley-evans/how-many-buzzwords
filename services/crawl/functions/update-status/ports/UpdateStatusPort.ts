import { CrawlStatus } from "buzzword-crawl-urls-repository-library";

interface UpdateStatusPort {
    updateCrawlStatus(baseURL: URL, newStatus: CrawlStatus): Promise<boolean>;
}

export default UpdateStatusPort;
