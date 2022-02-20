import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ObjectValidator } from "buzzword-aws-crawl-common";
import { StatusCodes } from 'http-status-codes';

import APIGatewayAdapter from "../../../interfaces/APIGatewayAdapter";
import GetContentPort from "../ports/GetContentPort";

type ValidParameters = {
    url: string
}

class GetContentAdapter implements APIGatewayAdapter {
    constructor(
        private port: GetContentPort,
        private validator: ObjectValidator<ValidParameters>
    ) {}

    async handleRequest(
        event: APIGatewayProxyEvent
    ): Promise<APIGatewayProxyResult> {
        let validatedURL: URL;
        try {
            const validatedParameters = this.validator.validate(
                event.queryStringParameters
            );
            validatedURL = this.parseURL(validatedParameters.url);
        } catch (ex) {
            const message = 'Invalid event';
            console.error(
                message + 
                `${ex instanceof Error ? ex.message : JSON.stringify(ex)}`
            );
            return this.createResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'text/plain',
                message
            );
        }

        try {
            const content = await this.port.getPageContent(validatedURL);
            return this.createResponse(
                StatusCodes.OK,
                'text/html',
                content
            );
        } catch (ex) {
            const message = 'Error occurred during retrieval of page content';
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

        url = decodeURIComponent(url);
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
    GetContentAdapter,
    ValidParameters
};
