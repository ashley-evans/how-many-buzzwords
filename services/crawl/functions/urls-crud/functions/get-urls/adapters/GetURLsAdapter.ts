import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ObjectValidator } from "buzzword-aws-crawl-common";
import { StatusCodes } from 'http-status-codes';

import APIGatewayAdapter from "../../../interfaces/APIGatewayAdapter";
import { GetURLsPort } from "../ports/GetURLsPort";

type ValidParameters = {
    baseURL: string
};

class GetURLsAdapter implements APIGatewayAdapter {
    constructor(
        private port: GetURLsPort,
        private validator: ObjectValidator<ValidParameters>
    ) {}

    async handleRequest(
        event: APIGatewayProxyEvent
    ): Promise<APIGatewayProxyResult> {
        let validatedURL: URL;
        try {
            const validatedParameters = this.validator.validate(
                event.pathParameters
            );
            validatedURL = this.parseURL(validatedParameters.baseURL);
        } catch (ex) {
            const message = 'Invalid event';
            console.error(
                message + 
                `: ${ex instanceof Error ? ex.message : JSON.stringify(ex)}`
            );
            return this.createResponse(
                StatusCodes.BAD_REQUEST,
                'text/plain',
                message
            );
        }

        try {
            const response = await this.port.getPathnames(validatedURL);
            if (response.length > 0) {
                return this.createResponse(
                    StatusCodes.OK,
                    'application/json',
                    JSON.stringify({
                        baseURL: validatedURL.hostname,
                        pathnames: response
                    })
                );
            }

            return this.createResponse(
                StatusCodes.NOT_FOUND,
                'text/plain',
                'URL provided has not been crawled recently.'
            );
        } catch (ex) {
            const message = 'Error occurred during GET';
            console.error(
                message + 
                `: ${ex instanceof Error ? ex.message : JSON.stringify(ex)}`
            );
            return this.createResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'text/plain',
                message
            );
        }
    }

    private parseURL(url: string): URL {
        if (!isNaN(parseInt(url))) {
            throw 'Number provided when expecting URL';
        }

        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            url = `http://${url}`;
        }

        return new URL(url);
    }

    private createResponse(
        code: StatusCodes,
        contentType: string,
        body: string
    ): APIGatewayProxyResult {
        return {
            statusCode: code,
            headers: {
                'Content-Type': contentType
            },
            body
        };
    }
}

export {
    GetURLsAdapter,
    ValidParameters
};
