import dayjs from "dayjs";
import { Repository } from "buzzword-aws-crawl-urls-repository-library";

import { RecentCrawlPort, RecentCrawlResponse } from "../ports/RecentCrawlPort";

class RecentCrawlDomain implements RecentCrawlPort {
    constructor(
        private repository: Repository,
        private maxCrawlAgeHours: number
    ) {}

    async hasCrawledRecently(
        baseURL: URL
    ): Promise<RecentCrawlResponse | undefined> {
        const crawlStatusRecord = await this.repository.getCrawlStatus(
            baseURL.hostname
        );

        if (crawlStatusRecord) {
            return {
                recentlyCrawled: this.isDateAfterMax(
                    crawlStatusRecord.createdAt
                ),
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
