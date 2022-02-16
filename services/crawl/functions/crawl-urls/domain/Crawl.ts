import { Repository } from "buzzword-aws-crawl-urls-repository-library";
import {
    ContentRepository
} from "buzzword-aws-crawl-content-repository-library";

import { CrawlerResponse, CrawlPort} from "../ports/CrawlPort";
import { CrawlProvider } from "../ports/CrawlProvider";

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
            const storagePromises: Promise<boolean>[] = [];
            this.crawler.crawl(baseURL, maxCrawlDepth).subscribe({
                next: (childURL) => {
                    const promise = this.storePathname(baseURL, childURL.url);
                    storagePromises.push(promise);
                    promise.then((isStored) => {
                        if (!isStored) {
                            resolve({ 
                                success: false,
                                pathnames
                            });
                        } else {
                            pathnames.push(childURL.url.pathname);
                        }
                    });
                },
                complete: async () => {
                    await Promise.allSettled(storagePromises);
                    resolve({ 
                        success: pathnames.length != 0,
                        pathnames
                    });
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

    private async storePathname(baseURL: URL, childURL: URL): Promise<boolean> {
        try {
            return await this.urlRepository.storePathname(
                baseURL.hostname, 
                childURL.pathname
            );
        } catch (ex) {
            console.error(
                `Error occured during storage: ${JSON.stringify(ex)}`
            );

            return false;
        }
    }
}

export default Crawl;
