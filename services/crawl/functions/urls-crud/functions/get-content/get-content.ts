import { JSONSchemaType } from "ajv";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    ContentRepository,
    S3Repository
} from "buzzword-aws-crawl-content-repository-library";
import { AjvValidator, ObjectValidator } from "buzzword-aws-crawl-common";

import GetContentDomain from "./domain/GetContentDomain";
import {
    GetContentAdapter,
    ValidParameters
} from "./adapters/GetContentAdapter";

function createContentRepository(): ContentRepository {
    if (!process.env.CONTENT_BUCKET_NAME) {
        throw new Error('Content Bucket Name has not been set.');
    }

    return new S3Repository(process.env.CONTENT_BUCKET_NAME);
}

function createValidator(): ObjectValidator<ValidParameters> {
    const schema: JSONSchemaType<ValidParameters> = {
        type: "object",
        properties: {
            url: {
                type: "string"
            }
        },
        required: ["url"]
    };

    return new AjvValidator<ValidParameters>(schema);
}


async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const repository = createContentRepository();
    const port = new GetContentDomain(repository);
    const validator = createValidator();

    const adapter = new GetContentAdapter(port, validator);

    return adapter.handleRequest(event);
}

export {
    handler
};
