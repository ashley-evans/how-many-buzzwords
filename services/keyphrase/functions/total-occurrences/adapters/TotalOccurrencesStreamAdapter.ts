import {
    DynamoDBRecord,
    DynamoDBStreamEvent,
    SQSBatchResponse,
} from "aws-lambda";
import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
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
    };
};

const schema: JSONSchemaType<ValidOccurrenceRecord> = {
    type: "object",
    properties: {
        eventName: {
            type: "string",
            enum: [AcceptedEventNames.Insert],
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

        try {
            const parsedRecord = this.parseRecord(event.Records[0]);
            await this.port.updateTotal([parsedRecord]);
        } catch (ex) {
            console.log(
                `record: ${JSON.stringify(
                    event.Records[0]
                )} error: ${JSON.stringify(ex)}`
            );
            return this.createResponse();
        }

        return this.createResponse();
    }

    private parseRecord(record: DynamoDBRecord): OccurrenceItem {
        const validatedRecord = this.validator.validate(record);
        const streamRecord = validatedRecord.dynamodb;
        const splitSK =
            streamRecord.Keys[KeyphraseTableKeyFields.RangeKey].S.split("#");

        if (splitSK.length != 2) {
            throw new Error("An invalid SK was provided, missing seperator");
        }

        const parsedOccurrences = parseInt(
            streamRecord.NewImage[KeyphraseTableNonKeyFields.Occurrences].N
        );

        if (isNaN(parsedOccurrences)) {
            throw new Error("A non-numeric occurrences valid was provided");
        }

        return {
            current: {
                baseURL: streamRecord.Keys[KeyphraseTableKeyFields.HashKey].S,
                pathname: splitSK[0],
                keyphrase: splitSK[1],
                occurrences: parsedOccurrences,
            },
        };
    }

    private createResponse(): SQSBatchResponse {
        return { batchItemFailures: [] };
    }
}

export default TotalOccurrencesStreamAdapter;
