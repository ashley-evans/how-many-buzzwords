import { CrawlStatus } from "buzzword-aws-crawl-urls-repository-library";

interface UpdateStatusPort {
    updateCrawlStatus(baseURL: URL, newStatus: CrawlStatus): Promise<boolean>;
}

export default UpdateStatusPort;
