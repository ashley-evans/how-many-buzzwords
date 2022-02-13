import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    Repository,
    URLsTableRepository
} from "buzzword-aws-crawl-urls-repository-library";

import GetURLsDomain from './domain/GetURLsDomain';
import GetURLsAdapter from "./adapters/GetURLsAdapter";

function createRepository() : Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error('URLs Table Name has not been set.');
    }

    return new URLsTableRepository(process.env.TABLE_NAME);
}

async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const repository = createRepository();
    const port = new GetURLsDomain(repository);
    const adapter = new GetURLsAdapter(port);

    return adapter.handleRequest(event);
}

export {
    handler
};
