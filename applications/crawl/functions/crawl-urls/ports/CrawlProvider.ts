import { Observable } from 'rxjs';

interface CrawlProvider {
    crawl(baseURL: URL): Observable<URL>
}

export default CrawlProvider;
