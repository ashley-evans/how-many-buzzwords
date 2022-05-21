import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import { ActiveConnectionsTableKeyFields } from "buzzword-aws-active-connections-repository-library";

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
                                },
                                required: [
                                    ActiveConnectionsTableKeyFields.ConnectionIDKey,
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
            connections = this.mapConnectionDetails(validatedEvent.Records);
        } catch {
            return { batchItemFailures: [] };
        }

        await this.port.provideCurrentKeyphrases(connections);

        return { batchItemFailures: [] };
    }

    private mapConnectionDetails(
        records: ValidNewConnectionRecord[]
    ): Connection[] {
        const connections: Connection[] = records.map(() => {
            return {
                connectionID: "test_connection_id",
                callbackURL: new URL("https://www.callback.com/"),
                baseURL: "www.example.com",
            };
        });

        return connections;
    }
}

export default NewConnectionStreamAdapter;
