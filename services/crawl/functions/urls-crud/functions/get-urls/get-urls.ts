import { JSONSchemaType } from "ajv";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    Repository,
    URLsTableRepository,
} from "buzzword-aws-crawl-urls-repository-library";
import {
    AjvValidator,
    ObjectValidator,
} from "@ashley-evans/buzzword-object-validator";

import GetURLsDomain from "./domain/GetURLsDomain";
import { GetURLsAdapter, ValidParameters } from "./adapters/GetURLsAdapter";

function createRepository(): Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error("URLs Table Name has not been set.");
    }

    return new URLsTableRepository(process.env.TABLE_NAME);
}

function createValidator(): ObjectValidator<ValidParameters> {
    const schema: JSONSchemaType<ValidParameters> = {
        type: "object",
        properties: {
            baseURL: {
                type: "string",
            },
        },
        required: ["baseURL"],
    };

    return new AjvValidator<ValidParameters>(schema);
}

async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const repository = createRepository();
    const port = new GetURLsDomain(repository);
    const validator = createValidator();

    const adapter = new GetURLsAdapter(port, validator);

    return adapter.handleRequest(event);
}

export { handler };
