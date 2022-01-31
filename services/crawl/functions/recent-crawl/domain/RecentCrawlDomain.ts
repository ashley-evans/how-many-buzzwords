import dayjs from 'dayjs';
import { Repository } from 'buzzword-aws-crawl-urls-repository-library';

import { RecentCrawlPort, RecentCrawlResponse } from '../ports/RecentCrawlPort';

class RecentCrawlDomain implements RecentCrawlPort {
    constructor(
        private repository: Repository, 
        private maxCrawlAgeHours: number
    ) {}

    async hasCrawledRecently(
        baseURL: URL
    ): Promise<RecentCrawlResponse | undefined> {
        const pathnameItem = await this.repository.getPathname(
            baseURL.hostname,
            baseURL.pathname
        );

        if (pathnameItem) {
            return {
                recentlyCrawled: this.isDateAfterMax(pathnameItem.createdAt),
                crawlTime: pathnameItem.createdAt
            };
        }
    }

    private isDateAfterMax(date: Date): boolean {
        const max = dayjs().subtract(
            this.maxCrawlAgeHours,
            'hour'
        );
        
        return dayjs(date).isAfter(max);
    }
}

export default RecentCrawlDomain;
