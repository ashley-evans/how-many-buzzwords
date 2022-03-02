import { ObjectValidator } from "buzzword-aws-crawl-common";

import { CrawlPort } from "../ports/CrawlPort";
import {
    CrawlEvent,
    CrawlResponse,
    PrimaryAdapter,
} from "../ports/PrimaryAdapter";
import CrawlError from "../errors/CrawlError";

interface ValidCrawlEvent {
    url: string;
    depth?: number;
}

class CrawlEventAdapter implements PrimaryAdapter {
    constructor(
        private crawler: CrawlPort,
        private validator: ObjectValidator<ValidCrawlEvent>
    ) {}

    async crawl(event: CrawlEvent): Promise<CrawlResponse> {
        let validatedEvent: ValidCrawlEvent;
        let url: URL;
        try {
            validatedEvent = this.validator.validate(event);

            url = new URL(validatedEvent.url);
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);
            console.error(
                `Error occurred in event validation: ${errorContent}`
            );

            return { baseURL: event.url, success: false };
        }

        try {
            const response = await this.crawler.crawl(
                url,
                validatedEvent.depth
            );

            if (!response.success) {
                const crawledErrorText = response.pathnames
                    ? response.pathnames.toString()
                    : "No pages";
                throw new CrawlError(
                    `Crawl failed to execute. Crawled: ${crawledErrorText}`
                );
            }

            return {
                success: true,
                baseURL: url.hostname,
                pathnames: response.pathnames,
            };
        } catch (ex) {
            if (ex instanceof CrawlError) {
                throw ex;
            }

            throw new CrawlError(
                `Error occured during crawl: ${JSON.stringify(ex)}`
            );
        }
    }
}

export { CrawlEventAdapter, ValidCrawlEvent };
