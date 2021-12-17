import { Observable } from 'rxjs';

interface CrawlProvider {
    maxCrawlDepth: number;
    maxRequests: number;

    crawl(baseURL: URL, maxDepth?: number): Observable<URL>;
}

export default CrawlProvider;
