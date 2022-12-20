import {
    DynamoDBStreamEvent,
    SQSBatchItemFailure,
    SQSBatchResponse,
} from "aws-lambda";
import {
    KeyphraseTableConstants,
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
    SiteKeyphrase,
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
        SequenceNumber: string;
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
                SequenceNumber: {
                    type: "string",
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
            required: ["Keys", "NewImage", "SequenceNumber"],
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
        const validRecords: ValidOccurrenceRecord[] = [];
        for (const record of event.Records) {
            try {
                const validRecord = this.validator.validate(record);
                validRecords.push(validRecord);
                itemsToTotal.push(this.parseRecord(validRecord));
            } catch {
                console.log(
                    `Skipping invalid record: ${JSON.stringify(record)}`
                );
            }
        }

        if (itemsToTotal.length != 0) {
            try {
                const failures = await this.port.updateTotal(itemsToTotal);
                if (failures.length > 0) {
                    return this.createPartialFailureResponse(
                        validRecords,
                        failures
                    );
                }
            } catch (ex) {
                console.error(`An error occurred while totalling: ${ex}`);
                this.throwFullError(itemsToTotal);
            }
        }

        return this.createResponse();
    }

    private parseRecord(
        validRecord: ValidOccurrenceRecord
    ): OccurrenceItem | TotalItem {
        const streamRecord = validRecord.dynamodb;
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
            validRecord.eventName == AcceptedEventNames.Modify &&
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

    private throwFullError(items: (OccurrenceItem | TotalItem)[]) {
        throw new Error(
            `Failed to update totals for provided records: ${JSON.stringify(
                items
            )}`
        );
    }

    private createPartialFailureResponse(
        validRecords: ValidOccurrenceRecord[],
        failures: SiteKeyphrase[]
    ): SQSBatchResponse {
        console.error(
            `Failed to update totals for: ${JSON.stringify(failures)}`
        );

        const batchItemFailures: SQSBatchItemFailure[] = failures.map(
            (failure) => {
                const matchingRecord = validRecords.find((record) => {
                    const keys = record.dynamodb.Keys;
                    return (
                        keys[KeyphraseTableKeyFields.HashKey].S ==
                            failure.baseURL,
                        keys[KeyphraseTableKeyFields.RangeKey].S ==
                            `${failure.pathname}#${failure.keyphrase}`
                    );
                });

                if (!matchingRecord) {
                    throw new Error(
                        `Unable to find matching record for: ${JSON.stringify(
                            failure
                        )}`
                    );
                }

                return {
                    itemIdentifier: matchingRecord.dynamodb.SequenceNumber,
                };
            }
        );

        return { batchItemFailures };
    }
}

export default TotalOccurrencesStreamAdapter;
