import {
    CrawlStatus,
    Repository,
} from "buzzword-crawl-urls-repository-library";
import { EventClient } from "buzzword-crawl-event-client-library";

import UpdateStatusPort from "../ports/UpdateStatusPort";

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
