import dayjs from "dayjs";
import {
    CrawlStatus,
    Repository,
} from "buzzword-crawl-urls-repository-library";
import { getDomain } from "tldts";

import { RecentCrawlPort, RecentCrawlResponse } from "../ports/RecentCrawlPort";

class RecentCrawlDomain implements RecentCrawlPort {
    constructor(
        private repository: Repository,
        private maxCrawlAgeHours: number
    ) {}

    async hasCrawledRecently(
        baseURL: URL
    ): Promise<RecentCrawlResponse | undefined> {
        const url = baseURL.toString();
        const domain = getDomain(url);
        if (!domain) {
            throw new Error(`Unable to find domain in URL: ${url}`);
        }

        const crawlStatusRecord = await this.repository.getCrawlStatus(domain);
        if (crawlStatusRecord) {
            const recentlyCrawled =
                crawlStatusRecord.status == CrawlStatus.FAILED
                    ? false
                    : this.isDateAfterMax(crawlStatusRecord.createdAt);

            return {
                recentlyCrawled,
                status: crawlStatusRecord.status,
                crawlTime: crawlStatusRecord.createdAt,
            };
        }

        return undefined;
    }

    private isDateAfterMax(date: Date): boolean {
        const max = dayjs().subtract(this.maxCrawlAgeHours, "hour");

        return dayjs(date).isAfter(max);
    }
}

export default RecentCrawlDomain;
