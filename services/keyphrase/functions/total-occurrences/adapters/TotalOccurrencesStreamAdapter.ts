import {
    DynamoDBRecord,
    DynamoDBStreamEvent,
    SQSBatchResponse,
} from "aws-lambda";
import {
    KeyphraseTableConstants,
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "buzzword-keyphrase-keyphrase-repository-library";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import DynamoDBSteamAdapter from "../../interfaces/DynamoDBStreamAdapter";
import {
    OccurrenceItem,
    TotalItem,
    TotalOccurrencesPort,
} from "../ports/TotalOccurrencesPort";

enum AcceptedEventNames {
    Insert = "INSERT",
    Modify = "MODIFY",
}

type ValidOccurrenceRecord = {
    eventName: AcceptedEventNames;
    dynamodb: {
        Keys: {
            [KeyphraseTableKeyFields.HashKey]: { S: string };
            [KeyphraseTableKeyFields.RangeKey]: { S: string };
        };
        NewImage: {
            [KeyphraseTableNonKeyFields.Occurrences]: { N: string };
            [KeyphraseTableNonKeyFields.Aggregated]?: { BOOL: boolean };
        };
        OldImage?: {
            [KeyphraseTableNonKeyFields.Occurrences]: { N: string };
            [KeyphraseTableNonKeyFields.Aggregated]?: { BOOL: boolean };
        };
    };
};

const schema: JSONSchemaType<ValidOccurrenceRecord> = {
    type: "object",
    properties: {
        eventName: {
            type: "string",
            enum: [AcceptedEventNames.Insert, AcceptedEventNames.Modify],
        },
        dynamodb: {
            type: "object",
            properties: {
                Keys: {
                    type: "object",
                    properties: {
                        [KeyphraseTableKeyFields.HashKey]: {
                            type: "object",
                            properties: {
                                S: { type: "string" },
                            },
                            required: ["S"],
                        },
                        [KeyphraseTableKeyFields.RangeKey]: {
                            type: "object",
                            properties: {
                                S: { type: "string" },
                            },
                            required: ["S"],
                        },
                    },
                    required: [
                        KeyphraseTableKeyFields.HashKey,
                        KeyphraseTableKeyFields.RangeKey,
                    ],
                },
                NewImage: {
                    type: "object",
                    properties: {
                        [KeyphraseTableNonKeyFields.Occurrences]: {
                            type: "object",
                            properties: {
                                N: { type: "string" },
                            },
                            required: ["N"],
                        },
                        [KeyphraseTableNonKeyFields.Aggregated]: {
                            type: "object",
                            properties: {
                                BOOL: { type: "boolean" },
                            },
                            required: ["BOOL"],
                            nullable: true,
                        },
                    },
                    required: [KeyphraseTableNonKeyFields.Occurrences],
                },
                OldImage: {
                    type: "object",
                    properties: {
                        [KeyphraseTableNonKeyFields.Occurrences]: {
                            type: "object",
                            properties: {
                                N: { type: "string" },
                            },
                            required: ["N"],
                        },
                        [KeyphraseTableNonKeyFields.Aggregated]: {
                            type: "object",
                            properties: {
                                BOOL: { type: "boolean" },
                            },
                            required: ["BOOL"],
                            nullable: true,
                        },
                    },
                    required: [KeyphraseTableNonKeyFields.Occurrences],
                    nullable: true,
                },
            },
            required: ["Keys", "NewImage"],
        },
    },
    required: ["eventName", "dynamodb"],
};

class TotalOccurrencesStreamAdapter implements DynamoDBSteamAdapter {
    private validator: AjvValidator<ValidOccurrenceRecord>;

    constructor(private port: TotalOccurrencesPort) {
        this.validator = new AjvValidator(schema);
    }

    async handleEvent(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
        if (!Array.isArray(event.Records)) {
            return this.createResponse();
        }

        const itemsToTotal: (OccurrenceItem | TotalItem)[] = [];
        for (const record of event.Records) {
            try {
                itemsToTotal.push(this.parseRecord(record));
            } catch {
                console.log(
                    `Skipping invalid record: ${JSON.stringify(record)}`
                );
            }
        }

        if (itemsToTotal.length != 0) {
            try {
                const success = await this.port.updateTotal(itemsToTotal);
                if (!success) {
                    this.throwFailureError(itemsToTotal);
                }
            } catch {
                this.throwFailureError(itemsToTotal);
            }
        }

        return this.createResponse();
    }

    private parseRecord(record: DynamoDBRecord): OccurrenceItem | TotalItem {
        const validatedRecord = this.validator.validate(record);
        const streamRecord = validatedRecord.dynamodb;
        const partitionKey =
            streamRecord.Keys[KeyphraseTableKeyFields.HashKey].S;
        const sortKey = streamRecord.Keys[KeyphraseTableKeyFields.RangeKey].S;
        const newOccurrences =
            streamRecord.NewImage[KeyphraseTableNonKeyFields.Occurrences].N;
        const oldOccurrences =
            streamRecord.OldImage?.[KeyphraseTableNonKeyFields.Occurrences].N;
        const newAggregated =
            streamRecord.NewImage[KeyphraseTableNonKeyFields.Aggregated]?.BOOL;
        const oldAggregated =
            streamRecord.OldImage?.[KeyphraseTableNonKeyFields.Aggregated]
                ?.BOOL;

        if (
            validatedRecord.eventName == AcceptedEventNames.Modify &&
            !streamRecord.OldImage
        ) {
            throw new Error(
                "An invalid modify event was provided, no old image"
            );
        }

        if (partitionKey == KeyphraseTableConstants.TotalKey) {
            return this.createTotalItem(
                sortKey,
                newOccurrences,
                oldOccurrences
            );
        }

        const splitSK = sortKey.split("#");
        if (splitSK.length != 2) {
            throw new Error("An invalid SK was provided, missing seperator");
        }

        const pathname = splitSK[0];
        const keyphrase = splitSK[1];
        if (pathname == KeyphraseTableConstants.TotalKey) {
            return this.createTotalItem(
                keyphrase,
                newOccurrences,
                oldOccurrences,
                partitionKey
            );
        }

        return this.createOccurrenceItem(
            partitionKey,
            pathname,
            keyphrase,
            newOccurrences,
            oldOccurrences,
            newAggregated,
            oldAggregated
        );
    }

    private createOccurrenceItem(
        partitionKey: string,
        pathname: string,
        keyphrase: string,
        newOccurrences: string,
        oldOccurences?: string,
        newAggregated?: boolean,
        oldAggregated?: boolean
    ): OccurrenceItem {
        return {
            current: {
                baseURL: partitionKey,
                pathname,
                keyphrase,
                occurrences: this.parseOccurrence(newOccurrences),
                aggregated: newAggregated,
            },
            previous: oldOccurences
                ? {
                      baseURL: partitionKey,
                      pathname,
                      keyphrase,
                      occurrences: this.parseOccurrence(oldOccurences),
                      aggregated: oldAggregated,
                  }
                : undefined,
        };
    }

    private createTotalItem(
        keyphrase: string,
        newOccurrences: string,
        oldOccurrences?: string,
        baseURL?: string
    ): TotalItem {
        return {
            current: {
                baseURL,
                keyphrase,
                occurrences: this.parseOccurrence(newOccurrences),
            },
            previous: oldOccurrences
                ? {
                      baseURL,
                      keyphrase,
                      occurrences: this.parseOccurrence(oldOccurrences),
                  }
                : undefined,
        };
    }

    private parseOccurrence(occurrences: string): number {
        const parsedOccurrences = parseInt(occurrences);

        if (isNaN(parsedOccurrences)) {
            throw new Error("A non-numeric occurrences valid was provided");
        }

        return parsedOccurrences;
    }

    private createResponse(): SQSBatchResponse {
        return { batchItemFailures: [] };
    }

    private throwFailureError(items: (OccurrenceItem | TotalItem)[]) {
        throw new Error(
            `Failed to update totals for provided records: ${JSON.stringify(
                items
            )}`
        );
    }
}

export default TotalOccurrencesStreamAdapter;
