import { CrawlClient } from "@ashley-evans/buzzword-crawl-client";
import { TextRepository } from "buzzword-aws-text-repository-library";

import HTMLParsingProvider from "../ports/HTMLParsingProvider";
import ScrapeURLPort from "../ports/ScrapeURLPort";

class ScrapeURLDomain implements ScrapeURLPort {
    constructor(
        private crawlClient: CrawlClient,
        private htmlParser: HTMLParsingProvider,
        private repository: TextRepository
    ) {}

    async scrapeURL(url: URL): Promise<boolean> {
        try {
            const html = await this.crawlClient.getContent(url);
            const parsedHTML = this.htmlParser.parseHTML(html);
            return await this.repository.storePageText(url, parsedHTML);
        } catch {
            return false;
        }
    }
}

export default ScrapeURLDomain;
