import {
    DynamoDBStreamEvent,
    SQSBatchItemFailure,
    SQSBatchResponse,
} from "aws-lambda";
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
    Modify = "MODIFY",
    Remove = "REMOVE",
}

type ValidUpdateConnectionsRecord = {
    eventName: ValidEventNames;
    dynamodb: {
        Keys: {
            [KeyphraseTableKeyFields.HashKey]: { S: string };
            [KeyphraseTableKeyFields.RangeKey]: { S: string };
        };
        NewImage:
            | {
                  [KeyphraseTableNonKeyFields.Occurrences]: { N: string };
              }
            | undefined;
        SequenceNumber: string;
    };
};

const schema: JSONSchemaType<ValidUpdateConnectionsRecord> = {
    type: "object",
    properties: {
        eventName: {
            type: "string",
            enum: [
                ValidEventNames.Insert,
                ValidEventNames.Modify,
                ValidEventNames.Remove,
            ],
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
                    nullable: true,
                },
                SequenceNumber: {
                    type: "string",
                },
            },
            required: ["Keys", "SequenceNumber"],
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
            return this.createReponse();
        }

        const validOccurrences: BaseURLOccurrences[] = [];
        const validRecords: ValidUpdateConnectionsRecord[] = [];
        for (const record of event.Records) {
            try {
                const validatedRecord = this.validator.validate(record);
                validOccurrences.push(
                    this.validateKeyphraseChange(validatedRecord)
                );
                validRecords.push(validatedRecord);
            } catch (ex) {
                const errorContent =
                    ex instanceof Error ? ex.message : JSON.stringify(ex);
                console.log(
                    `An invalid update connections record was provided: ${errorContent}. Record: ${JSON.stringify(
                        record
                    )}`
                );
            }
        }

        if (validOccurrences.length > 0) {
            const failures = await this.port.updateExistingConnections(
                validOccurrences
            );

            return this.createReponse(failures, validRecords);
        }

        return this.createReponse();
    }

    private validateKeyphraseChange(
        record: ValidUpdateConnectionsRecord
    ): BaseURLOccurrences {
        const newImage = record.dynamodb.NewImage;
        let occurrences: number | undefined;
        if (newImage) {
            occurrences = parseInt(
                newImage[KeyphraseTableNonKeyFields.Occurrences].N
            );
        } else if (record.eventName == ValidEventNames.Remove) {
            occurrences = 0;
        }

        if (occurrences == undefined || isNaN(occurrences)) {
            throw new Error(
                "Invalid occurrences provided with modify/insert record"
            );
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

    private createReponse(
        failures?: BaseURLOccurrences[],
        records?: ValidUpdateConnectionsRecord[]
    ): SQSBatchResponse {
        const batchItemFailures: SQSBatchItemFailure[] = [];
        if (failures && records) {
            for (const failure of failures) {
                const failureSequenceNumbers: SQSBatchItemFailure[] = records
                    .filter((record) => {
                        const keys = record.dynamodb.Keys;
                        return (
                            keys[KeyphraseTableKeyFields.HashKey].S ==
                                failure.baseURL &&
                            keys[KeyphraseTableKeyFields.RangeKey].S ==
                                `${failure.pathname}#${failure.keyphrase}`
                        );
                    })
                    .map((record) => ({
                        itemIdentifier: record.dynamodb.SequenceNumber,
                    }));

                batchItemFailures.push(...failureSequenceNumbers);
            }
        }

        return { batchItemFailures };
    }
}

export default UpdateConnectionsStreamAdapter;
