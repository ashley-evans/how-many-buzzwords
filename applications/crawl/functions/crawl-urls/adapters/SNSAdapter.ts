import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import { SQSBatchResponse, SQSEvent } from "aws-lambda";

import CrawlPort from "../ports/CrawlPort";
import PrimarySNSAdapter from "../ports/PrimarySNSAdapter";

interface RequestBody {
    url: string,
    depth?: number
}

class SNSAdapter implements PrimarySNSAdapter {
    private ajv: Ajv;
    private validator;

    constructor(private crawler: CrawlPort) {
        this.ajv = new Ajv();
        this.validator = this.createValidator();
    }

    async crawl(event: SQSEvent): Promise<SQSBatchResponse> {
        for (const record of event.Records) {
            const validatedBody = this.validateRequestBody(record.body);
            const url = new URL(validatedBody.url);

            await this.crawler.crawl(url, validatedBody.depth);
        }

        return { batchItemFailures: [] };
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

    private validateRequestBody(body: string): RequestBody {
        const json = JSON.parse(body);

        if (this.validator(json)) {
            return json;
        } else {
            throw this.validator.errors;
        }
    }
}

export default SNSAdapter;
