import {
    DynamoDBRecord,
    DynamoDBStreamEvent,
    SQSBatchResponse,
} from "aws-lambda";
import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
    SiteKeyphraseOccurrences,
} from "buzzword-aws-keyphrase-repository-library";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import DynamoDBSteamAdapter from "../../interfaces/DynamoDBStreamAdapter";
import {
    OccurrenceItem,
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
        };
        OldImage:
            | { [KeyphraseTableNonKeyFields.Occurrences]: { N: string } }
            | undefined;
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

        const itemsToTotal: OccurrenceItem[] = [];
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
            await this.port.updateTotal(itemsToTotal);
        }

        return this.createResponse();
    }

    private parseRecord(record: DynamoDBRecord): OccurrenceItem {
        const validatedRecord = this.validator.validate(record);
        const streamRecord = validatedRecord.dynamodb;
        if (
            validatedRecord.eventName == AcceptedEventNames.Modify &&
            !streamRecord.OldImage
        ) {
            throw new Error(
                "An invalid modify event was provided, no old image"
            );
        }

        const splitSK =
            streamRecord.Keys[KeyphraseTableKeyFields.RangeKey].S.split("#");

        if (splitSK.length != 2) {
            throw new Error("An invalid SK was provided, missing seperator");
        }

        const baseURL = streamRecord.Keys[KeyphraseTableKeyFields.HashKey].S;
        const pathname = splitSK[0];
        const keyphrase = splitSK[1];

        return {
            current: this.parseOccurrence(
                baseURL,
                pathname,
                keyphrase,
                streamRecord.NewImage[KeyphraseTableNonKeyFields.Occurrences].N
            ),
            previous: streamRecord.OldImage
                ? this.parseOccurrence(
                      baseURL,
                      pathname,
                      keyphrase,
                      streamRecord.OldImage[
                          KeyphraseTableNonKeyFields.Occurrences
                      ].N
                  )
                : undefined,
        };
    }

    private parseOccurrence(
        baseURL: string,
        pathname: string,
        keyphrase: string,
        occurrences: string
    ): SiteKeyphraseOccurrences {
        const parsedOccurrences = parseInt(occurrences);

        if (isNaN(parsedOccurrences)) {
            throw new Error("A non-numeric occurrences valid was provided");
        }

        return {
            baseURL,
            pathname,
            keyphrase,
            occurrences: parsedOccurrences,
        };
    }

    private createResponse(): SQSBatchResponse {
        return { batchItemFailures: [] };
    }
}

export default TotalOccurrencesStreamAdapter;
