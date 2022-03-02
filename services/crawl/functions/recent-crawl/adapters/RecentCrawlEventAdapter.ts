import { ObjectValidator } from "buzzword-aws-crawl-common";

import {
    RecentCrawlAdapter,
    RecentCrawlAdapterResponse,
    RecentCrawlEvent,
} from "../ports/RecentCrawlAdapter";
import { RecentCrawlPort } from "../ports/RecentCrawlPort";

type ValidRecentCrawlEvent = {
    url: string;
};

class RecentCrawlEventAdapter implements RecentCrawlAdapter {
    constructor(
        private port: RecentCrawlPort,
        private validator: ObjectValidator<ValidRecentCrawlEvent>
    ) {}

    async hasCrawledRecently(
        event: RecentCrawlEvent
    ): Promise<RecentCrawlAdapterResponse> {
        const url = this.validateEvent(event);

        const response = await this.port.hasCrawledRecently(url);
        if (response) {
            return {
                baseURL: url.toString(),
                recentlyCrawled: response.recentlyCrawled,
                crawlTime: response.crawlTime,
            };
        }

        return {
            baseURL: url.toString(),
            recentlyCrawled: false,
        };
    }

    private validateEvent(event: RecentCrawlEvent): URL {
        try {
            const validated = this.validator.validate(event);

            return new URL(validated.url);
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);

            throw new Error(
                `Exception occurred during event validation: ${errorContent}`
            );
        }
    }
}

export { ValidRecentCrawlEvent, RecentCrawlEventAdapter };
