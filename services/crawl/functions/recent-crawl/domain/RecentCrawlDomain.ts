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
                recentlyCrawled: false,
                crawlTime: pathnameItem?.createdAt
            };
        }
    }
}

export default RecentCrawlDomain;
