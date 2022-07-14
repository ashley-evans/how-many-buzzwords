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
