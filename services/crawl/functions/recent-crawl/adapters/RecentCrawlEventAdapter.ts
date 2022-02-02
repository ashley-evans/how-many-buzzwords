import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';

import RecentCrawlDomain from "../domain/RecentCrawlDomain";
import {
    RecentCrawlAdapter,
    RecentCrawlAdapterResponse,
    RecentCrawlEvent
} from "../ports/RecentCrawlAdapter";

type ValidEventBody = {
    url: string
};

class RecentCrawlEventAdapter implements RecentCrawlAdapter {
    private ajv: Ajv;
    private validator;

    constructor(private domain: RecentCrawlDomain) {
        this.ajv = new Ajv();
        this.validator = this.createValidator();
    }

    async hasCrawledRecently(
        event: RecentCrawlEvent
    ): Promise<RecentCrawlAdapterResponse> {
        let validatedBody: ValidEventBody;
        let url: URL;
        try {
            validatedBody = this.validateRequestBody(event);

            url = new URL(validatedBody.url);
        } catch (ex) {
            throw new Error(
                `Exception occured during event validation: ${ex}`
            );
        }
        
        const response = await this.domain.hasCrawledRecently(url);
        if (response) {
            return {
                baseURL: url.toString(),
                recentlyCrawled: response.recentlyCrawled,
                crawlTime: response.crawlTime
            };
        }

        return {
            baseURL: url.toString(),
            recentlyCrawled: false
        };
    }

    private createValidator(): ValidateFunction<ValidEventBody> {
        const schema: JSONSchemaType<ValidEventBody> = {
            type: "object",
            properties: {
                url: {
                    type: "string"
                }
            },
            required: ["url"]
        };

        return this.ajv.compile(schema);
    }

    private validateRequestBody(event: RecentCrawlEvent): ValidEventBody {
        if (this.validator(event)) {
            return event;
        } else {
            throw this.validator.errors;
        }
    }
}

export default RecentCrawlEventAdapter;
