import {
    RequestOptions,
    CheerioHandlePageInputs,
    utils,
    RequestQueue,
    openRequestQueue,
    CheerioCrawler,
    CheerioCrawlerOptions,
    CrawlingContext,
    RequestAsBrowserOptions,
    PseudoUrl
} from "apify";
import { Observable, Subject } from "rxjs";
import CrawlProvider from "../ports/CrawlProvider";

class ApifyProvider implements CrawlProvider {
    maxCrawlDepth: number;
    maxRequests: number;
    
    private crawledURLs: Subject<URL>;

    constructor(maxCrawlDepth: number, maxRequests: number) {
        this.maxCrawlDepth = maxCrawlDepth;
        this.maxRequests = maxRequests;
        this.crawledURLs = new Subject<URL>();
    }

    crawl(baseURL: URL, maxDepth?: number): Observable<URL> {
        this.createRequestQueue(baseURL, maxDepth).then(
            async (requestQueue) => {
                const domainMatcher = this.createDomainMatcher(baseURL);
                const crawler = this.createCrawler(requestQueue, domainMatcher);

                await crawler.run();

                await requestQueue.drop();
                this.crawledURLs.complete();
            }
        );

        return this.crawledURLs.asObservable();
    }

    private async createRequestQueue(
        baseURL: URL,
        maxDepth?: number
    ): Promise<RequestQueue> {
        const request: RequestOptions = {
            url: baseURL.toString(),
        };

        if (maxDepth !== undefined) {
            request.userData = {
                maxCrawlDepth: maxDepth
            };
        }

        const requestQueue = await openRequestQueue();
        await requestQueue.addRequest(request);
        
        return requestQueue;
    }

    private createDomainMatcher(url: URL): PseudoUrl {
        const domainName = url.hostname.replace('www.', '');
        const matcherRegExp = new RegExp(
            `(^|\\s)https?://(www.)?${domainName}([-a-zA-Z0-9()@:%_+.~#?&//=]*)`
        );

        return new PseudoUrl(matcherRegExp);
    }

    private createCrawler(
        requestQueue: RequestQueue,
        crawlerPattern: PseudoUrl
    ): CheerioCrawler {
        const maxCrawlDepth = this.maxCrawlDepth;
        const crawledURLs = this.crawledURLs;
        const crawlPage = this.crawlPage;
        
        const crawlerOptions: CheerioCrawlerOptions = {
            handlePageFunction: (async (context: CheerioHandlePageInputs) => {
                crawlPage(
                    context,
                    requestQueue,
                    maxCrawlDepth,
                    crawledURLs,
                    crawlerPattern
                );
            }),
            requestQueue,
            maxRequestsPerCrawl: this.maxRequests,
            preNavigationHooks: [
                async (
                    crawlingContext: CrawlingContext,
                    requestAsBrowerOptions: RequestAsBrowserOptions
                ) => {
                    requestAsBrowerOptions.useHttp2 = false;
                },
            ]
        };

        return new CheerioCrawler(crawlerOptions);
    }

    private async crawlPage(
        inputs : CheerioHandlePageInputs,
        requestQueue: RequestQueue,
        maxCrawlDepth: number,
        crawledURLs: Subject<URL>,
        crawlerPattern: PseudoUrl
    ) {
        const { request, $ } = inputs;
        console.log(`Crawled to ${request.url}`);

        const requestUserData = request.userData;

        const currentDepth = isNaN(requestUserData.currentDepth) 
            ? 0 
            : Number(requestUserData.currentDepth);

        let maxDepthAllowed = maxCrawlDepth;
        if (!isNaN(requestUserData.maxCrawlDepth)) {
            const specifiedMaxDepth = Number(requestUserData.maxCrawlDepth);

            if (specifiedMaxDepth < maxCrawlDepth) {
                maxDepthAllowed = specifiedMaxDepth;
            }
        }

        if (currentDepth < maxDepthAllowed) {
            await utils.enqueueLinks({
                $,
                requestQueue,
                baseUrl: request.loadedUrl,
                transformRequestFunction: (request) => {
                    request.userData = {
                        currentDepth: currentDepth + 1,
                        maxCrawlDepth: maxDepthAllowed
                    };
    
                    return request;
                },
                pseudoUrls: [
                    crawlerPattern
                ]
            });
        }

        crawledURLs.next(new URL(request.url));
    }
}

export default ApifyProvider;
