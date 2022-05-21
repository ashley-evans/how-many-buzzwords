import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";
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

type ValidNewConnectionEvent = {
    Records: ValidNewConnectionRecord[];
};

const schema: JSONSchemaType<ValidNewConnectionEvent> = {
    type: "object",
    properties: {
        Records: {
            type: "array",
            items: {
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
                                    [ActiveConnectionsTableKeyFields.ConnectionIDKey]:
                                        {
                                            type: "object",
                                            properties: {
                                                S: {
                                                    type: "string",
                                                },
                                            },
                                            required: ["S"],
                                        },
                                    [ActiveConnectionsTableKeyFields.ListeningURLKey]:
                                        {
                                            type: "object",
                                            properties: {
                                                S: {
                                                    type: "string",
                                                },
                                            },
                                            required: ["S"],
                                        },
                                    [ActiveConnectionsTableNonKeyFields.CallbackURLKey]:
                                        {
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
            },
        },
    },
    required: ["Records"],
};

class NewConnectionStreamAdapter implements DynamoDBSteamAdapter {
    private validator: AjvValidator<ValidNewConnectionEvent>;

    constructor(private port: NewConnectionPort) {
        this.validator = new AjvValidator(schema);
    }

    async handleEvent(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
        let connections: Connection[];
        try {
            const validatedEvent = this.validator.validate(event);
            connections = validatedEvent.Records.map((record) =>
                this.mapConnection(record)
            );
        } catch {
            return { batchItemFailures: [] };
        }

        await this.port.provideCurrentKeyphrases(connections);

        return { batchItemFailures: [] };
    }

    private mapConnection(record: ValidNewConnectionRecord): Connection {
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
}

export default NewConnectionStreamAdapter;
