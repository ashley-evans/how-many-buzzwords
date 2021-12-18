import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from "aws-lambda";

import CrawlPort from "../ports/CrawlPort";
import PrimarySQSAdapter from "../ports/PrimarySQSAdapter";

interface RequestBody {
    url: string,
    depth?: number
}

class SQSAdapter implements PrimarySQSAdapter {
    private ajv: Ajv;
    private validator;

    constructor(private crawler: CrawlPort) {
        this.ajv = new Ajv();
        this.validator = this.createValidator();
    }

    async crawl(event: SQSEvent): Promise<SQSBatchResponse> {
        const failedCrawls: SQSBatchItemFailure[] = [];

        for (const record of event.Records) {
            let validatedBody: RequestBody;
            let url: URL;
            try {
                validatedBody = this.validateRequestBody(record.body);

                url = new URL(validatedBody.url);
            } catch (ex) {
                console.error(
                    `Error occured in body validation: ${JSON.stringify(ex)}`
                );

                continue;
            }

            try {
                const success = await this.crawler.crawl(
                    url, 
                    validatedBody.depth
                );

                if (!success) {
                    failedCrawls.push({ 
                        itemIdentifier: record.messageId
                    });
                }
            } catch (ex) {
                console.error(
                    `Error occured during crawl: ${JSON.stringify(ex)}`
                );

                failedCrawls.push({ 
                    itemIdentifier: record.messageId
                });
            }
        }

        return { batchItemFailures: failedCrawls };
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

export default SQSAdapter;
