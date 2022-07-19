import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import { JSONSchemaType } from "ajv";

import {
    RecentCrawlAdapter,
    RecentCrawlAdapterResponse,
    RecentCrawlEvent,
} from "../ports/RecentCrawlAdapter";
import { RecentCrawlPort } from "../ports/RecentCrawlPort";

type ValidRecentCrawlEvent = {
    url: string;
};

const schema: JSONSchemaType<ValidRecentCrawlEvent> = {
    type: "object",
    properties: {
        url: {
            type: "string",
        },
    },
    required: ["url"],
};

class RecentCrawlEventAdapter implements RecentCrawlAdapter {
    private validator: AjvValidator<ValidRecentCrawlEvent>;

    constructor(private port: RecentCrawlPort) {
        this.validator = new AjvValidator(schema);
    }

    async hasCrawledRecently(
        event: RecentCrawlEvent
    ): Promise<RecentCrawlAdapterResponse> {
        const url = this.validateEvent(event);

        const response = await this.port.hasCrawledRecently(url);
        if (response) {
            return {
                baseURL: url.hostname,
                recentlyCrawled: response.recentlyCrawled,
                crawlTime: response.crawlTime,
            };
        }

        return {
            baseURL: url.hostname,
            recentlyCrawled: false,
        };
    }

    private validateEvent(event: RecentCrawlEvent): URL {
        try {
            const validated = this.validator.validate(event);

            return this.parseURL(validated.url);
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);

            throw new Error(
                `Exception occurred during event validation: ${errorContent}`
            );
        }
    }

    private parseURL(url: string): URL {
        if (!isNaN(parseInt(url))) {
            throw "Number provided when expecting URL.";
        }

        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            url = `https://${url}`;
        }

        return new URL(url);
    }
}

export { ValidRecentCrawlEvent, RecentCrawlEventAdapter };
