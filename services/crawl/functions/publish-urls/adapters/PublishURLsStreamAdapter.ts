import {
    DynamoDBStreamEvent,
    SQSBatchItemFailure,
    SQSBatchResponse,
} from "aws-lambda";
import { EventClient } from "buzzword-crawl-event-client-library";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import {
    URLsTableConstants,
    URLsTableKeyFields,
} from "buzzword-crawl-urls-repository-library";

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

        const validRecords: ValidRecord[] = [];
        const urls: URL[] = [];
        for (const record of event.Records) {
            try {
                const validatedRecord = this.validator.validate(record);
                urls.push(this.parseRecord(validatedRecord));
                validRecords.push(validatedRecord);
            } catch {
                console.log(
                    `Skipping invalid record: ${JSON.stringify(record)}`
                );
            }
        }

        if (urls.length != 0) {
            try {
                const failures = await this.client.publishURL(urls);
                return this.createResponse(failures, validRecords);
            } catch {
                return this.createResponse(urls, validRecords);
            }
        }

        return this.createResponse();
    }

    private parseRecord(record: ValidRecord): URL {
        const newURLImage = record.dynamodb.NewImage;
        const pk = newURLImage[URLsTableKeyFields.HashKey].S;
        if (!pk.startsWith(`${URLsTableConstants.URLPartitionKeyPrefix}#`)) {
            throw "Invalid PK provided, missing URL prefix";
        }

        const sk = newURLImage[URLsTableKeyFields.SortKey].S;
        if (!sk.startsWith(`${URLsTableConstants.PathSortKeyPrefix}#`)) {
            throw "Invalid SK provided, missing Path prefix";
        }

        const hostname = pk.split("#")[1];
        const pathname = sk.split("#")[1];
        if (!isNaN(parseInt(hostname))) {
            throw "Number provided when expecting valid base URL.";
        }

        if (pathname.charAt(0) != "/") {
            throw "Invalid pathname provided, expected leading forward slash";
        }

        return new URL(`https://${hostname}${pathname}`);
    }

    private createResponse(
        failedURLs?: URL[],
        records?: ValidRecord[]
    ): SQSBatchResponse {
        const batchItemFailures: SQSBatchItemFailure[] = [];
        if (failedURLs && records) {
            for (const url of failedURLs) {
                const matchingRecord = records.find((record) => {
                    const newImage = record.dynamodb.NewImage;
                    return (
                        newImage[URLsTableKeyFields.HashKey].S ==
                            `${URLsTableConstants.URLPartitionKeyPrefix}#${url.hostname}` &&
                        newImage[URLsTableKeyFields.SortKey].S ==
                            `${URLsTableConstants.PathSortKeyPrefix}#${url.pathname}`
                    );
                });

                if (!matchingRecord) {
                    throw new Error(
                        `Unable to find matching record for URL: ${url}`
                    );
                }

                batchItemFailures.push({
                    itemIdentifier: matchingRecord.dynamodb.SequenceNumber,
                });
            }
        }

        return {
            batchItemFailures,
        };
    }
}

export default PublishURLsStreamAdapter;
