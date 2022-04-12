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
    queryStringParameters: {
        baseURL: string;
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
                },
            },
            required: ["baseURL"],
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
    required: ["queryStringParameters", "requestContext"],
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
        let validatedBaseURL: URL;
        try {
            validatedEvent = this.validator.validate(event);
            validatedBaseURL = new URL(
                validatedEvent.queryStringParameters.baseURL
            );
        } catch (ex) {
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

        await this.port.storeConnection(
            requestContext.connectionId,
            callbackURL,
            validatedBaseURL
        );

        return this.createResponse(
            StatusCodes.OK,
            "text/plain",
            "Successfully connected."
        );
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
}

export { WebSocketAdapter, ValidRouteKeys, ValidEvent };
