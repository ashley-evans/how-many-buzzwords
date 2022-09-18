import {
    DynamoDBRecord,
    DynamoDBStreamEvent,
    SQSBatchResponse,
} from "aws-lambda";
import { EventClient } from "buzzword-crawl-event-client-library";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import { URLsTableKeyFields } from "buzzword-crawl-urls-repository-library";

import DynamoDBStreamAdapter from "../interfaces/DynamoDBStreamAdapter";

type ValidRecord = {
    dynamodb: {
        NewImage: {
            [URLsTableKeyFields.HashKey]: { S: string };
            [URLsTableKeyFields.SortKey]: { S: string };
        };
        SequenceNumber: string;
    };
};

const schema: JSONSchemaType<ValidRecord> = {
    type: "object",
    properties: {
        dynamodb: {
            type: "object",
            properties: {
                NewImage: {
                    type: "object",
                    properties: {
                        [URLsTableKeyFields.HashKey]: {
                            type: "object",
                            properties: {
                                S: { type: "string" },
                            },
                            required: ["S"],
                        },
                        [URLsTableKeyFields.SortKey]: {
                            type: "object",
                            properties: {
                                S: { type: "string" },
                            },
                            required: ["S"],
                        },
                    },
                    required: [
                        URLsTableKeyFields.HashKey,
                        URLsTableKeyFields.SortKey,
                    ],
                },
                SequenceNumber: {
                    type: "string",
                },
            },
            required: ["NewImage", "SequenceNumber"],
        },
    },
    required: ["dynamodb"],
};

class PublishURLsStreamAdapter implements DynamoDBStreamAdapter {
    private validator: AjvValidator<ValidRecord>;

    constructor(private client: EventClient) {
        this.validator = new AjvValidator(schema);
    }

    async handleEvent(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
        if (!Array.isArray(event.Records)) {
            return this.createResponse();
        }

        const urls: URL[] = [];
        for (const record of event.Records) {
            try {
                urls.push(this.parseRecord(record));
            } catch {
                console.log(
                    `Skipping invalid record: ${JSON.stringify(record)}`
                );
            }
        }

        if (urls.length != 0) {
            await this.client.publishURL(urls);
        }

        return this.createResponse();
    }

    private parseRecord(record: DynamoDBRecord): URL {
        const validRecord = this.validator.validate(record);
        const newURLImage = validRecord.dynamodb.NewImage;
        const hostname = newURLImage[URLsTableKeyFields.HashKey].S;
        const pathname = newURLImage[URLsTableKeyFields.SortKey].S;

        if (!isNaN(parseInt(hostname))) {
            throw "Number provided when expecting valid base URL.";
        }

        if (pathname.charAt(0) != "/") {
            throw "Invalid pathname provided, expected leading forward slash";
        }

        return new URL(`https://${hostname}${pathname}`);
    }

    private createResponse(): SQSBatchResponse {
        return {
            batchItemFailures: [],
        };
    }
}

export default PublishURLsStreamAdapter;
