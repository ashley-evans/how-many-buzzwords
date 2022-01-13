import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';

import { CrawlPort } from "../ports/CrawlPort";
import {
    CrawlEvent,
    CrawlResponse,
    PrimaryAdapter
} from "../ports/PrimaryAdapter";
import CrawlError from "../errors/CrawlError";

interface RequestBody {
    url: string,
    depth?: number
}

class EventAdapter implements PrimaryAdapter {
    private ajv: Ajv;
    private validator;

    constructor(private crawler: CrawlPort) {
        this.ajv = new Ajv({ coerceTypes: true });
        this.validator = this.createValidator();
    }

    async crawl(event: CrawlEvent): Promise<CrawlResponse> {
        let validatedBody: RequestBody;
        let url: URL;
        try {
            validatedBody = this.validateRequestBody(event);

            url = new URL(validatedBody.url);
        } catch (ex) {
            console.error(
                `Error occurred in body validation: ${JSON.stringify(ex)}`
            );

            return { baseURL: event.url, success: false };
        }

        try {
            const response = await this.crawler.crawl(
                url, 
                validatedBody.depth
            );

            if (!response.success) {
                const crawledErrorText = response.pathnames
                    ? response.pathnames.toString()
                    : 'No pages';
                throw new CrawlError(
                    `Crawl failed to execute. Crawled: ${crawledErrorText}`
                );
            }

            return {
                success: true,
                baseURL: url.hostname,
                pathnames: response.pathnames
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

    private createValidator(): ValidateFunction<RequestBody> {
        const schema: JSONSchemaType<RequestBody> = {
            type: "object",
            properties: {
                url: {
                    type: "string"
                },
                depth: {
                    type: "integer", 
                    nullable: true
                }
            },
            required: ["url"]
        };

        return this.ajv.compile(schema);
    }

    private validateRequestBody(event: CrawlEvent): RequestBody {
        if (this.validator(event)) {
            return event;
        } else {
            throw this.validator.errors;
        }
    }
}

export default EventAdapter;
