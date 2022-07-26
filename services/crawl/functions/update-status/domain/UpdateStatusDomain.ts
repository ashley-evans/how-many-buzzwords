import {
    CrawlStatus,
    Repository,
} from "buzzword-aws-crawl-urls-repository-library";

import UpdateStatusPort from "../ports/UpdateStatusPort";

class UpdateStatusDomain implements UpdateStatusPort {
    constructor(private repository: Repository) {}

    async updateCrawlStatus(
        baseURL: URL,
        newStatus: CrawlStatus
    ): Promise<boolean> {
        try {
            return await this.repository.updateCrawlStatus(
                baseURL.hostname,
                newStatus
            );
        } catch {
            return false;
        }
    }
}

export default UpdateStatusDomain;
