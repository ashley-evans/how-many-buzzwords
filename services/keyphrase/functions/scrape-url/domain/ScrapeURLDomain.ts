import { CrawlClient } from "@ashley-evans/buzzword-crawl-client";
import { TextRepository } from "buzzword-keyphrase-text-repository-library";

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

            console.log(`Starting HTML parsing for: ${url.toString()}`);
            const parsedHTML = this.htmlParser.parseHTML(html);
            console.log(`Finished HTML parsing for: ${url.toString()}`);

            return await this.repository.storePageText(url, parsedHTML);
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);

            console.error(
                `Error occurred during page text storage: ${errorContent}`
            );

            return false;
        }
    }
}

export default ScrapeURLDomain;
