import {
    RequestOptions,
    RequestQueue,
    CheerioCrawler,
    CheerioCrawlerOptions,
    CheerioCrawlingContext,
    EnqueueStrategy,
} from "@crawlee/cheerio";
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
                const crawler = this.createCrawler(requestQueue);

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

        const requestQueue = await RequestQueue.open();
        await requestQueue.addRequest(request);

        return requestQueue;
    }

    private createCrawler(requestQueue: RequestQueue): CheerioCrawler {
        const crawlerOptions: CheerioCrawlerOptions = {
            requestHandler: async (context) =>
                this.crawlPage(
                    context,
                    this.settings.maxCrawlDepth,
                    this.crawledURLs
                ),
            requestQueue,
            maxRequestsPerCrawl: this.settings.maxRequests,
            minConcurrency: this.settings.minConcurrency ?? 10,
            maxConcurrency: this.settings.maxConcurrency ?? 20,
            autoscaledPoolOptions: {
                autoscaleIntervalSecs: this.settings.autoScaleInterval ?? 10,
            },
        };

        return new CheerioCrawler(crawlerOptions);
    }

    private async crawlPage(
        context: CheerioCrawlingContext,
        maxCrawlDepth: number,
        crawledURLs: Subject<CrawlResult>
    ) {
        const { request, enqueueLinks, body } = context;
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
            await enqueueLinks({
                userData: {
                    currentDepth: currentDepth + 1,
                    maxCrawlDepth: maxDepthAllowed,
                },
                strategy: EnqueueStrategy.SameDomain,
            });
        }

        crawledURLs.next({
            url: new URL(request.url),
            content: body.toString(),
        });
    }
}

export { ApifyProvider, CrawlerSettings };
