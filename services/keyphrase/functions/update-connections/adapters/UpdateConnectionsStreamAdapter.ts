import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import { JSONSchemaType } from "ajv";
import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "buzzword-aws-keyphrase-repository-library";

import DynamoDBStreamAdapter from "../../interfaces/DynamoDBStreamAdapter";
import {
    UpdateConnectionsPort,
    BaseURLOccurrences,
} from "../ports/UpdateConnectionsPort";

enum ValidEventNames {
    Insert = "INSERT",
}

type ValidUpdateConnectionsRecord = {
    eventName: ValidEventNames;
    dynamodb: {
        Keys: {
            [KeyphraseTableKeyFields.HashKey]: { S: string };
            [KeyphraseTableKeyFields.RangeKey]: { S: string };
        };
        NewImage: {
            [KeyphraseTableNonKeyFields.Occurrences]: { N: string };
        };
        SequenceNumber: string;
    };
};

const schema: JSONSchemaType<ValidUpdateConnectionsRecord> = {
    type: "object",
    properties: {
        eventName: {
            type: "string",
            enum: [ValidEventNames.Insert],
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
                SequenceNumber: {
                    type: "string",
                },
            },
            required: ["Keys", "NewImage", "SequenceNumber"],
        },
    },
    required: ["eventName", "dynamodb"],
};

class UpdateConnectionsStreamAdapter implements DynamoDBStreamAdapter {
    private validator: AjvValidator<ValidUpdateConnectionsRecord>;

    constructor(private port: UpdateConnectionsPort) {
        this.validator = new AjvValidator(schema);
    }

    async handleEvent(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
        if (!Array.isArray(event.Records)) {
            return { batchItemFailures: [] };
        }

        let occurrenceUpdates: BaseURLOccurrences;
        try {
            const validatedRecord = this.validator.validate(event.Records[0]);
            occurrenceUpdates = this.validateKeyphraseChange(validatedRecord);
        } catch (ex) {
            console.log(
                `An invalid update connections record was provided: ${JSON.stringify(
                    ex
                )}. Record: ${JSON.stringify(event.Records[0])}`
            );

            return { batchItemFailures: [] };
        }

        await this.port.updateExistingConnections([occurrenceUpdates]);

        return { batchItemFailures: [] };
    }

    private validateKeyphraseChange(
        record: ValidUpdateConnectionsRecord
    ): BaseURLOccurrences {
        const occurrences = parseInt(
            record.dynamodb.NewImage[KeyphraseTableNonKeyFields.Occurrences].N
        );
        if (isNaN(occurrences)) {
            throw new Error("Occurrences provided is NaN");
        }

        const splitSK =
            record.dynamodb.Keys[KeyphraseTableKeyFields.RangeKey].S.split("#");
        if (splitSK.length == 2) {
            return {
                baseURL:
                    record.dynamodb.Keys[KeyphraseTableKeyFields.HashKey].S,
                pathname: splitSK[0],
                keyphrase: splitSK[1],
                occurrences,
            };
        }

        throw new Error("An invalid SK was provided");
    }
}

export default UpdateConnectionsStreamAdapter;
