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
        await this.crawlClient.getContent(url);

        return true;
    }
}

export default ScrapeURLDomain;
