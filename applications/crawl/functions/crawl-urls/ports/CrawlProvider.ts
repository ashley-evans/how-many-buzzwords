import { Observable } from 'rxjs';

interface CrawlProvider {
    maxCrawlDepth: number;

    crawl(baseURL: URL): Observable<URL>;
}

export default CrawlProvider;
