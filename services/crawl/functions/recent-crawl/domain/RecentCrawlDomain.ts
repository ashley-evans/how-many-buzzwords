import dayjs from "dayjs";
import {
    CrawlStatus,
    Repository,
} from "buzzword-aws-crawl-urls-repository-library";

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
