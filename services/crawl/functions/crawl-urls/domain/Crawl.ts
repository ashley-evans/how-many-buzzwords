import { CrawlerResponse, CrawlPort} from "../ports/CrawlPort";
import CrawlProvider from "../ports/CrawlProvider";
import Repository from "../ports/Repository";

class Crawl implements CrawlPort {
    constructor(
        private crawler: CrawlProvider, 
        private repository: Repository
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
                    const promise = this.storePathname(baseURL, childURL);
                    storagePromises.push(promise);
                    promise
                        .then(() => {
                            pathnames.push(childURL.pathname);
                        })
                        .catch((ex) => {
                            console.error(
                                `An error occured during storage: ${ex}`
                            );
                            resolve({ 
                                success: false,
                                pathnames
                            });
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

    private storePathname(baseURL: URL, childURL: URL): Promise<boolean> {
        return new Promise((resolve) => {
            this.repository.storePathname(
                baseURL.hostname,
                childURL.pathname
            ).then((value: boolean) => {
                resolve(value);
            }).catch((ex: unknown) => {
                console.error(
                    `Error occured during storage: ${JSON.stringify(ex)}`
                );
                
                resolve(false);
            });
        });
    }
}

export default Crawl;
