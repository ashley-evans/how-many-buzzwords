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
    private crawledURLs: Subject<URL>;

    constructor() {
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
        const crawledURLs = this.crawledURLs;
        const crawlPage = this.crawlPage;
        const crawlerOptions: CheerioCrawlerOptions = {
            handlePageFunction: (async (context: CheerioHandlePageInputs) => {
                crawlPage(context, crawledURLs, requestQueue);
            }),
            requestList,
            requestQueue,
        };

        return new CheerioCrawler(crawlerOptions);
    }

    private async crawlPage(
        inputs : CheerioHandlePageInputs,
        crawledURLs: Subject<URL>,
        requestQueue: RequestQueue
    ) {
        const { request, $ } = inputs;

        await utils.enqueueLinks({
            $,
            requestQueue,
            baseUrl: request.loadedUrl
        });

        crawledURLs.next(new URL(request.url));
    }

}

export default ApifyProvider;
