import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import { CrawlPort } from "../ports/CrawlPort";
import {
    CrawlEvent,
    CrawlResponse,
    PrimaryAdapter,
} from "../ports/PrimaryAdapter";
import CrawlError from "../errors/CrawlError";

type ValidCrawlEvent = {
    url: string;
    depth?: number;
};

const schema: JSONSchemaType<ValidCrawlEvent> = {
    type: "object",
    properties: {
        url: {
            type: "string",
        },
        depth: {
            type: "integer",
            nullable: true,
        },
    },
    required: ["url"],
};

class CrawlEventAdapter implements PrimaryAdapter {
    private validator: AjvValidator<ValidCrawlEvent>;

    constructor(private crawler: CrawlPort) {
        this.validator = new AjvValidator(schema);
    }

    async crawl(event: CrawlEvent): Promise<CrawlResponse> {
        let validatedEvent: ValidCrawlEvent;
        let url: URL;
        try {
            validatedEvent = this.validator.validate(event);

            url = this.parseURL(validatedEvent.url);
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);
            console.error(
                `Error occurred in event validation: ${errorContent}`
            );

            return { url: event.url, success: false };
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
                url: url.hostname,
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

export { CrawlEventAdapter, ValidCrawlEvent };
