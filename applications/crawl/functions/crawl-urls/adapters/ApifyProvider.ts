import {
    RequestList,
    RequestOptions,
    openRequestList,
    CheerioHandlePageInputs,
    utils,
    RequestQueue,
    openRequestQueue,
    CheerioCrawler,
    CheerioCrawlerOptions
} from "apify";
import { Observable, Subject } from "rxjs";
import CrawlProvider from "../ports/CrawlProvider";

class ApifyProvider implements CrawlProvider {
    maxCrawlDepth: number;
    
    private crawledURLs: Subject<URL>;

    constructor(maxCrawlDepth: number) {
        this.maxCrawlDepth = maxCrawlDepth;
        this.crawledURLs = new Subject<URL>();
    }

    crawl(baseURL: URL): Observable<URL> {
        this.createRequestList(baseURL).then(async (requestList) => {
            const requestQueue = await openRequestQueue();
            const crawler = this.createCrawler(requestList, requestQueue);

            await crawler.run();

            this.crawledURLs.complete();
        });

        return this.crawledURLs.asObservable();
    }

    private async createRequestList(baseUrl: URL): Promise<RequestList> {
        const requestListData: RequestOptions[] = [
            {
                url: baseUrl.toString(),
            }
        ];

        return await openRequestList(
            null,
            requestListData
        );
    }
    
    private createCrawler(
        requestList: RequestList, 
        requestQueue: RequestQueue
    ): CheerioCrawler {
        const maxCrawlDepth = this.maxCrawlDepth;
        const crawledURLs = this.crawledURLs;
        const crawlPage = this.crawlPage;
        
        const crawlerOptions: CheerioCrawlerOptions = {
            handlePageFunction: (async (context: CheerioHandlePageInputs) => {
                crawlPage(context, requestQueue, maxCrawlDepth, crawledURLs);
            }),
            requestList,
            requestQueue,
        };

        return new CheerioCrawler(crawlerOptions);
    }

    private async crawlPage(
        inputs : CheerioHandlePageInputs,
        requestQueue: RequestQueue,
        maxCrawlDepth: number,
        crawledURLs: Subject<URL>
    ) {
        const { request, $ } = inputs;
        const requestUserData = request.userData;

        const currentDepth = isNaN(requestUserData.currentDepth) 
            ? 0 
            : Number(requestUserData.currentDepth);

        if (currentDepth < maxCrawlDepth) {
            await utils.enqueueLinks({
                $,
                requestQueue,
                baseUrl: request.loadedUrl,
                transformRequestFunction: (request) => {
                    request.userData = {
                        currentDepth: currentDepth + 1
                    };
    
                    return request;
                },
            });
        }

        crawledURLs.next(new URL(request.url));
    }

}

export default ApifyProvider;
