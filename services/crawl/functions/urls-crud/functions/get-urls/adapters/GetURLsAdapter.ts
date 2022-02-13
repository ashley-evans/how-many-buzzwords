import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';

import APIGatewayAdapter from "../../../interfaces/APIGatewayAdapter";
import { GetURLsPort } from "../ports/GetURLsPort";

type ValidParameters = {
    baseURL: string
};

class GetURLsAdapter implements APIGatewayAdapter {
    private validator;

    constructor(private port: GetURLsPort) {
        this.validator = this.createValidator();
    }

    async handleRequest(
        event: APIGatewayProxyEvent
    ): Promise<APIGatewayProxyResult> {
        let validatedURL: URL;
        try {
            const validatedParameters = this.validateRequestParameters(event);
            validatedURL = new URL(validatedParameters.baseURL);
        } catch (ex) {
            throw new Error(
                `Exception occured during event validation: ${ex}`
            );
        }

        const response = await this.port.getPathnames(validatedURL);

        return {
            statusCode: 200,
            body: JSON.stringify({
                baseURL: validatedURL.hostname,
                pathnames: response
            })
        };
    }

    private createValidator(): ValidateFunction<ValidParameters> {
        const ajv = new Ajv();
        const schema: JSONSchemaType<ValidParameters> = {
            type: "object",
            properties: {
                baseURL: {
                    type: "string"
                }
            },
            required: ["baseURL"]
        };

        return ajv.compile(schema);
    }

    private validateRequestParameters(
        event: APIGatewayProxyEvent
    ): ValidParameters {
        if (this.validator(event.pathParameters)) {
            return event.pathParameters;
        } else {
            throw this.validator.errors;
        }
    }
}

export default GetURLsAdapter;
