import {
    RequestOptions,
    CheerioHandlePageInputs,
    utils,
    RequestQueue,
    openRequestQueue,
    CheerioCrawler,
    CheerioCrawlerOptions,
    PseudoUrl,
} from "apify";
import { Observable, Subject } from "rxjs";
import { CrawlResult, CrawlProvider } from "../ports/CrawlProvider";

type CrawlerSettings = {
    maxCrawlDepth: number;
    maxRequests: number;
    minConcurrency?: number;
    maxConcurrency?: number;
    autoScaleInterval?: number;
};

class ApifyProvider implements CrawlProvider {
    private crawledURLs: Subject<CrawlResult>;

    constructor(private settings: CrawlerSettings) {
        console.log(`Configured to run with: ${JSON.stringify(settings)}`);

        this.crawledURLs = new Subject<CrawlResult>();
    }

    crawl(baseURL: URL, maxDepth?: number): Observable<CrawlResult> {
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
                maxCrawlDepth: maxDepth,
            };
        }

        const requestQueue = await openRequestQueue();
        await requestQueue.addRequest(request);

        return requestQueue;
    }

    private createDomainMatcher(url: URL): PseudoUrl {
        const domainName = url.hostname.replace("www.", "");
        const matcherRegExp = new RegExp(
            `(^|\\s)https?://(www.)?${domainName}([-a-zA-Z0-9()@:%_+.~#?&//=]*)`
        );

        return new PseudoUrl(matcherRegExp);
    }

    private createCrawler(
        requestQueue: RequestQueue,
        crawlerPattern: PseudoUrl
    ): CheerioCrawler {
        const maxCrawlDepth = this.settings.maxCrawlDepth;
        const crawledURLs = this.crawledURLs;
        const crawlPage = this.crawlPage;

        const crawlerOptions: CheerioCrawlerOptions = {
            handlePageFunction: async (context: CheerioHandlePageInputs) => {
                crawlPage(
                    context,
                    requestQueue,
                    maxCrawlDepth,
                    crawledURLs,
                    crawlerPattern
                );
            },
            requestQueue,
            maxRequestsPerCrawl: this.settings.maxRequests,
            minConcurrency: this.settings.minConcurrency ?? 1,
            maxConcurrency: this.settings.maxConcurrency ?? 2,
            autoscaledPoolOptions: {
                autoscaleIntervalSecs: this.settings.autoScaleInterval ?? 10,
            },
        };

        return new CheerioCrawler(crawlerOptions);
    }

    private async crawlPage(
        inputs: CheerioHandlePageInputs,
        requestQueue: RequestQueue,
        maxCrawlDepth: number,
        crawledURLs: Subject<CrawlResult>,
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
                        maxCrawlDepth: maxDepthAllowed,
                    };

                    return request;
                },
                pseudoUrls: [crawlerPattern],
            });
        }

        crawledURLs.next({
            url: new URL(request.url),
            content: inputs.body.toString(),
        });
    }
}

export { ApifyProvider, CrawlerSettings };
