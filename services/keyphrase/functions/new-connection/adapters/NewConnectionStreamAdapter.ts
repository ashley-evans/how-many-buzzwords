import {
    DynamoDBStreamEvent,
    DynamoDBRecord,
    SQSBatchResponse,
} from "aws-lambda";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "buzzword-aws-active-connections-repository-library";

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
            },
            required: ["NewImage"],
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
            return { batchItemFailures: [] };
        }

        const connections: Connection[] = [];
        for (const record of event.Records) {
            try {
                connections.push(this.validateConnection(record));
            } catch (ex) {
                console.log(
                    `An invalid new connection event was provided: ${JSON.stringify(
                        ex
                    )}. Record: ${JSON.stringify(record)}`
                );
            }
        }

        if (connections.length > 0) {
            await this.port.provideCurrentKeyphrases(connections);
        }

        return { batchItemFailures: [] };
    }

    private validateConnection(record: DynamoDBRecord): Connection {
        const validatedRecord = this.validator.validate(record);

        const callbackURL =
            validatedRecord.dynamodb.NewImage[
                ActiveConnectionsTableNonKeyFields.CallbackURLKey
            ].S;
        if (!isNaN(parseInt(callbackURL))) {
            throw "Number provided when expecting URL.";
        }

        return {
            connectionID:
                validatedRecord.dynamodb.NewImage[
                    ActiveConnectionsTableKeyFields.ConnectionIDKey
                ].S,
            callbackURL: new URL(callbackURL),
            baseURL:
                validatedRecord.dynamodb.NewImage[
                    ActiveConnectionsTableKeyFields.ListeningURLKey
                ].S,
        };
    }
}

export default NewConnectionStreamAdapter;
