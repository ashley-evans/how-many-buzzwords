import CrawlPort from "../ports/CrawlPort";
import CrawlProvider from "../ports/CrawlProvider";
import Repository from "../ports/Repository";

class Crawl implements CrawlPort {
    constructor(
        private crawler: CrawlProvider, 
        private repository: Repository
    ) {}

    crawl(baseURL: URL): boolean {
        const childUrls = this.crawler.crawl(baseURL);
        const pathnames = childUrls.map(url => url.pathname);

        return this.repository.storePathnames(baseURL.hostname, pathnames);
    }
}

export default Crawl;
