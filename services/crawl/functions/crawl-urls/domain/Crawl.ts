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
            const pathnameStorages: Promise<PathnameStored>[] = [];
            this.crawler.crawl(baseURL, maxCrawlDepth).subscribe({
                next: (result) => {
                    const promise = this.storeChildPage(
                        baseURL,
                        result
                    );
                    pathnameStorages.push(promise);
                },
                complete: async () => {
                    const pathnames = await this.getSuccessfulCrawls(
                        pathnameStorages
                    );
                    const success = this.wasCrawlSuccessful(
                        pathnames,
                        pathnameStorages.length
                    );
                    resolve({
                        success,
                        pathnames
                    });
                },
                error: async (ex: unknown) => {
                    console.error(
                        `Error occured during crawling: ${JSON.stringify(ex)}`
                    );

                    const pathnames = await this.getSuccessfulCrawls(
                        pathnameStorages
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

    private async getSuccessfulCrawls(
        promises: Promise<PathnameStored>[]
    ): Promise<string[]> {
        const results = await Promise.allSettled(promises);
        return results.reduce((accumulator: string[], current) => {
            if (current.status === 'fulfilled' && current.value.stored) {
                accumulator.push(current.value.pathname);
            }
            return accumulator;
        }, []);
    }

    private wasCrawlSuccessful(successPathnames: string[], expected: number) {
        return successPathnames.length == expected 
            && successPathnames.length > 0;
    }
}

export default Crawl;
