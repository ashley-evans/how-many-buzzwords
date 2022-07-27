import {
    CrawlStatus,
    Repository,
} from "buzzword-aws-crawl-urls-repository-library";

import UpdateStatusPort from "../ports/UpdateStatusPort";
import EventClient from "../ports/EventClient";

class UpdateStatusDomain implements UpdateStatusPort {
    constructor(
        private repository: Repository,
        private eventClient: EventClient
    ) {}

    async updateCrawlStatus(
        baseURL: URL,
        newStatus: CrawlStatus
    ): Promise<boolean> {
        try {
            const statusUpdated = await this.repository.updateCrawlStatus(
                baseURL.hostname,
                newStatus
            );

            if (statusUpdated) {
                return await this.eventClient.sentStatusUpdate(
                    baseURL.hostname,
                    newStatus
                );
            }

            return false;
        } catch {
            return false;
        }
    }
}

export default UpdateStatusDomain;
