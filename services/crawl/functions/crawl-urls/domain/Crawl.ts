import CrawlPort from "../ports/CrawlPort";
import CrawlProvider from "../ports/CrawlProvider";
import Repository from "../ports/Repository";

class Crawl implements CrawlPort {
    constructor(
        private crawler: CrawlProvider, 
        private repository: Repository
    ) {}

    async crawl(baseURL: URL, maxCrawlDepth?: number): Promise<boolean> {
        return new Promise((resolve) => {
            let urlsStored = 0;
            const storagePromises: Promise<boolean>[] = [];
            this.crawler.crawl(baseURL, maxCrawlDepth).subscribe({
                next: async (childURL) => {
                    // Store promise to ensure complete occurs after all nexts.
                    const promise = this.storePathname(baseURL, childURL);
                    storagePromises.push(promise);
                    const stored = await promise;
                    if (!stored) {
                        resolve(stored);
                    }

                    urlsStored += 1;
                },
                complete: async () => {
                    await Promise.allSettled(storagePromises);
                    resolve(urlsStored != 0);
                },
                error: (ex: unknown) => {
                    console.error(
                        `Error occured during crawling: ${JSON.stringify(ex)}`
                    );

                    resolve(false);
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
