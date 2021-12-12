import CrawlPort from "../ports/CrawlPort";
import CrawlProvider from "../ports/CrawlProvider";
import Repository from "../ports/Repository";

class Crawl implements CrawlPort {
    constructor(
        private crawler: CrawlProvider, 
        private repository: Repository
    ) {}

    async crawl(baseURL: URL): Promise<boolean> {
        try {
            const childUrls = await this.crawler.crawl(baseURL);
            if (childUrls.length == 0) {
                return false;
            }

            const pathnames = childUrls.map(url => url.pathname);
            console.log(pathnames);
            return await this.repository.storePathnames(
                baseURL.hostname, pathnames
            );
        } catch (ex: unknown) {
            console.error(
                `Error occured during crawling: ${JSON.stringify(ex)}`
            );

            return false;
        }
    }
}

export default Crawl;
