import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { StatusCodes } from "http-status-codes";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import { JSONSchemaType } from "ajv";

import APIGatewayAdapter from "../../interfaces/APIGatewayAdapter";
import ConnectionManagerPort from "../ports/ConnectionManagerPort";

enum ValidRouteKeys {
    connect = "$connect",
    disconnect = "$disconnect",
}

type ValidEvent = {
    queryStringParameters?: {
        baseURL?: string;
    };
    requestContext: {
        connectionId: string;
        domainName: string;
        stage: string;
        routeKey: ValidRouteKeys;
    };
};

const schema: JSONSchemaType<ValidEvent> = {
    type: "object",
    properties: {
        queryStringParameters: {
            type: "object",
            properties: {
                baseURL: {
                    type: "string",
                    nullable: true,
                },
            },
            nullable: true,
        },
        requestContext: {
            type: "object",
            properties: {
                connectionId: {
                    type: "string",
                },
                domainName: {
                    type: "string",
                },
                stage: {
                    type: "string",
                },
                routeKey: {
                    type: "string",
                    enum: [ValidRouteKeys.connect, ValidRouteKeys.disconnect],
                },
            },
            required: ["connectionId", "domainName", "stage", "routeKey"],
        },
    },
    required: ["requestContext"],
};

class WebSocketAdapter implements APIGatewayAdapter {
    private validator: AjvValidator<ValidEvent>;

    constructor(private port: ConnectionManagerPort) {
        this.validator = new AjvValidator(schema);
    }

    async handleRequest(
        event: APIGatewayProxyEvent
    ): Promise<APIGatewayProxyResult> {
        let validatedEvent: ValidEvent;
        try {
            validatedEvent = this.validator.validate(event);
        } catch (ex) {
            console.error(ex);
            return this.createResponse(
                StatusCodes.BAD_REQUEST,
                "text/plain",
                "Invalid event"
            );
        }

        if (validatedEvent.requestContext.routeKey == ValidRouteKeys.connect) {
            return this.storeNewConnection(validatedEvent);
        }

        return this.deleteConnection(
            validatedEvent.requestContext.connectionId
        );
    }

    private async storeNewConnection(
        validatedEvent: ValidEvent
    ): Promise<APIGatewayProxyResult> {
        let validatedBaseURL: URL;
        try {
            validatedBaseURL = this.parseURL(
                validatedEvent.queryStringParameters?.baseURL
            );
        } catch (ex) {
            console.error(ex);
            return this.createResponse(
                StatusCodes.BAD_REQUEST,
                "text/plain",
                "Invalid event"
            );
        }

        const requestContext = validatedEvent.requestContext;
        const callbackURL = new URL(
            `https://${requestContext.domainName}/${requestContext.stage}`
        );

        try {
            const stored = await this.port.storeConnection(
                requestContext.connectionId,
                callbackURL,
                validatedBaseURL
            );

            if (stored) {
                return this.createResponse(
                    StatusCodes.OK,
                    "text/plain",
                    "Successfully connected."
                );
            }

            return this.createResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                "text/plain",
                "Failed to store connection information."
            );
        } catch {
            return this.createResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                "text/plain",
                "An error occurred during storage of connection information."
            );
        }
    }

    private async deleteConnection(
        connectionID: string
    ): Promise<APIGatewayProxyResult> {
        try {
            const deleted = await this.port.deleteConnection(connectionID);

            if (deleted) {
                return this.createResponse(
                    StatusCodes.OK,
                    "text/plain",
                    "Successfully disconnected."
                );
            }

            return this.createResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                "text/plain",
                "Failed to disconnect."
            );
        } catch {
            return this.createResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                "text/plain",
                "An error occurred during disconnection."
            );
        }
    }

    private createResponse(
        statusCode: StatusCodes,
        contentType: string,
        body: string
    ): APIGatewayProxyResult {
        return {
            statusCode,
            headers: {
                "Content-Type": contentType,
            },
            body,
        };
    }

    private parseURL(url?: string): URL {
        if (!url) {
            throw "No URL provided.";
        }

        if (!isNaN(parseInt(url))) {
            throw "Number provided when expecting URL.";
        }

        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            url = `https://${url}`;
        }

        return new URL(url);
    }
}

export { WebSocketAdapter, ValidRouteKeys, ValidEvent };
