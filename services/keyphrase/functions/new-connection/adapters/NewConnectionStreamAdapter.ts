import {
    DynamoDBStreamEvent,
    SQSBatchResponse,
    SQSBatchItemFailure,
} from "aws-lambda";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "buzzword-aws-keyphrase-service-active-connections-repository-library";

import DynamoDBSteamAdapter from "../../interfaces/DynamoDBStreamAdapter";
import { Connection, NewConnectionPort } from "../ports/NewConnectionPort";

enum ValidEventNames {
    Insert = "INSERT",
}

type ValidNewConnectionRecord = {
    eventName: ValidEventNames.Insert;
    dynamodb: {
        NewImage: {
            [ActiveConnectionsTableKeyFields.ConnectionIDKey]: { S: string };
            [ActiveConnectionsTableKeyFields.ListeningURLKey]: { S: string };
            [ActiveConnectionsTableNonKeyFields.CallbackURLKey]: { S: string };
        };
        SequenceNumber: string;
    };
};

const schema: JSONSchemaType<ValidNewConnectionRecord> = {
    type: "object",
    properties: {
        eventName: {
            type: "string",
            const: ValidEventNames.Insert,
        },
        dynamodb: {
            type: "object",
            properties: {
                NewImage: {
                    type: "object",
                    properties: {
                        [ActiveConnectionsTableKeyFields.ConnectionIDKey]: {
                            type: "object",
                            properties: {
                                S: {
                                    type: "string",
                                },
                            },
                            required: ["S"],
                        },
                        [ActiveConnectionsTableKeyFields.ListeningURLKey]: {
                            type: "object",
                            properties: {
                                S: {
                                    type: "string",
                                },
                            },
                            required: ["S"],
                        },
                        [ActiveConnectionsTableNonKeyFields.CallbackURLKey]: {
                            type: "object",
                            properties: {
                                S: {
                                    type: "string",
                                },
                            },
                            required: ["S"],
                        },
                    },
                    required: [
                        ActiveConnectionsTableKeyFields.ConnectionIDKey,
                        ActiveConnectionsTableKeyFields.ListeningURLKey,
                        ActiveConnectionsTableNonKeyFields.CallbackURLKey,
                    ],
                },
                SequenceNumber: {
                    type: "string",
                },
            },
            required: ["NewImage", "SequenceNumber"],
        },
    },
    required: ["eventName"],
};

class NewConnectionStreamAdapter implements DynamoDBSteamAdapter {
    private validator: AjvValidator<ValidNewConnectionRecord>;

    constructor(private port: NewConnectionPort) {
        this.validator = new AjvValidator(schema);
    }

    async handleEvent(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
        if (!Array.isArray(event.Records)) {
            return this.createResponse();
        }

        const validatedRecords: ValidNewConnectionRecord[] = [];
        const connections: Connection[] = [];
        for (const record of event.Records) {
            try {
                const validRecord = this.validator.validate(record);
                connections.push(this.validateConnection(validRecord));
                validatedRecords.push(validRecord);
            } catch (ex) {
                console.log(
                    `An invalid new connection event was provided: ${JSON.stringify(
                        ex
                    )}. Record: ${JSON.stringify(record)}`
                );
            }
        }

        if (connections.length > 0) {
            try {
                const failureIDs = await this.port.provideCurrentKeyphrases(
                    connections
                );

                return this.createResponse(failureIDs, validatedRecords);
            } catch (ex) {
                console.error(
                    `An error occurred while sending keyphrase state: ${JSON.stringify(
                        ex
                    )}. Connections: ${JSON.stringify(connections)}`
                );

                return this.createResponse(
                    connections.map((connection) => connection.connectionID),
                    validatedRecords
                );
            }
        }

        return this.createResponse();
    }

    private validateConnection(record: ValidNewConnectionRecord): Connection {
        const callbackURL =
            record.dynamodb.NewImage[
                ActiveConnectionsTableNonKeyFields.CallbackURLKey
            ].S;
        if (!isNaN(parseInt(callbackURL))) {
            throw "Number provided when expecting URL.";
        }

        return {
            connectionID:
                record.dynamodb.NewImage[
                    ActiveConnectionsTableKeyFields.ConnectionIDKey
                ].S,
            callbackURL: new URL(callbackURL),
            baseURL:
                record.dynamodb.NewImage[
                    ActiveConnectionsTableKeyFields.ListeningURLKey
                ].S,
        };
    }

    private createResponse(
        failureIDs?: string[],
        records?: ValidNewConnectionRecord[]
    ): SQSBatchResponse {
        const batchItemFailures: SQSBatchItemFailure[] = [];
        if (failureIDs && records) {
            for (const id of failureIDs) {
                const failureSequenceNumbers: SQSBatchItemFailure[] = records
                    .filter(
                        (record) =>
                            record.dynamodb.NewImage[
                                ActiveConnectionsTableKeyFields.ConnectionIDKey
                            ].S == id
                    )
                    .map((record) => ({
                        itemIdentifier: record.dynamodb.SequenceNumber,
                    }));

                batchItemFailures.push(...failureSequenceNumbers);
            }
        }

        return { batchItemFailures };
    }
}

export default NewConnectionStreamAdapter;
