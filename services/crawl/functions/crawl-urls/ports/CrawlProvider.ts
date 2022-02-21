import { Observable } from 'rxjs';

type CrawlResult = {
    url: URL,
    content: string
}

interface CrawlProvider {
    maxCrawlDepth: number;
    maxRequests: number;

    crawl(baseURL: URL, maxDepth?: number): Observable<CrawlResult>;
}

export { 
    CrawlResult,
    CrawlProvider
};
