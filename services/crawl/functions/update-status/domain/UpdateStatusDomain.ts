import {
    CrawlStatus,
    Repository,
} from "buzzword-crawl-urls-repository-library";
import { EventClient } from "buzzword-crawl-event-client-library";
import { getDomain } from "tldts";

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
        const url = baseURL.toString();
        const domain = getDomain(url);
        if (!domain) {
            throw new Error(`Unable to find domain in URL: ${url}`);
        }

        try {
            const statusUpdated = await this.repository.updateCrawlStatus(
                domain,
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
