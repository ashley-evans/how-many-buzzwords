import { Observable } from 'rxjs';

interface CrawlProvider {
    maxCrawlDepth: number;

    crawl(baseURL: URL, maxDepth?: number): Observable<URL>;
}

export default CrawlProvider;
