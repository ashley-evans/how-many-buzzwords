import { Observable } from "rxjs";

type CrawlResult = {
    url: URL;
    content: string;
};

interface CrawlProvider {
    crawl(baseURL: URL, maxDepth?: number): Observable<CrawlResult>;
}

export { CrawlResult, CrawlProvider };
