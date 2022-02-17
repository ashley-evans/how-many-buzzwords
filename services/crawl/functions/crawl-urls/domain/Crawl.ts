import { Repository } from "buzzword-aws-crawl-urls-repository-library";
import {
    ContentRepository
} from "buzzword-aws-crawl-content-repository-library";

import { CrawlerResponse, CrawlPort} from "../ports/CrawlPort";
import { CrawlProvider, CrawlResult } from "../ports/CrawlProvider";

type PathnameStored = {
    pathname: string,
    stored: boolean
};

class Crawl implements CrawlPort {
    constructor(
        private crawler: CrawlProvider, 
        private urlRepository: Repository,
        private contentRepository: ContentRepository 
    ) {}

    async crawl(
        baseURL: URL, 
        maxCrawlDepth?: number
    ): Promise<CrawlerResponse> {
        return new Promise((resolve) => {
            const pathnames: string[] = [];
            const storagePromises: Promise<PathnameStored>[] = [];
            this.crawler.crawl(baseURL, maxCrawlDepth).subscribe({
                next: async (result) => {
                    pathnames.push(result.url.pathname);
                    const promise = this.storeChildPage(
                        baseURL,
                        result
                    );
                    storagePromises.push(promise);
                },
                complete: async () => {
                    try {
                        const results = await Promise.all(
                            storagePromises
                        );
                        const success = this.wasCrawlSuccess(results);
                        resolve({
                            success,
                            pathnames: success 
                                ? results.map((x) => x.pathname) 
                                : []
                        });
                    } catch (ex) {
                        console.error(
                            'Unhandled exception occured during crawl:' + 
                            JSON.stringify(ex)
                        );

                        resolve({
                            success: false,
                            pathnames: []
                        });
                    }

                },
                error: (ex: unknown) => {
                    console.error(
                        `Error occured during crawling: ${JSON.stringify(ex)}`
                    );

                    resolve({
                        success: false,
                        pathnames
                    });
                }
            });
        });
    }

    private async storeChildPage(
        baseURL: URL,
        crawlResult: CrawlResult
    ): Promise<PathnameStored> {
        const isURLStored = await this.urlRepository.storePathname(
            baseURL.hostname, 
            crawlResult.url.pathname
        );

        let isAllDataStored = false;
        if (isURLStored) {
            isAllDataStored = await this.contentRepository.storePageContent(
                crawlResult.url,
                crawlResult.content
            );
        }

        return {
            pathname: crawlResult.url.pathname,
            stored: isAllDataStored
        };
    }

    private wasCrawlSuccess(results: PathnameStored[]): boolean {
        return results.every((result) => result.stored)
            && results.length > 0;
    }
}

export default Crawl;
