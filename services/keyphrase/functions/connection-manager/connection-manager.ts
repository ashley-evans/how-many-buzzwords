import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    ActiveConnectionsRepository,
    ActiveConnectionsRepositoryPort,
} from "buzzword-aws-active-connections-repository-library";

import { WebSocketAdapter } from "./adapters/WebSocketAdapter";
import ConnectionManager from "./domain/ConnectionManager";

function createRepository(): ActiveConnectionsRepositoryPort {
    if (!process.env.TABLE_NAME) {
        throw new Error("Active Connections table name has not been set.");
    }

    return new ActiveConnectionsRepository(process.env.TABLE_NAME);
}

async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const repository = createRepository();
    const domain = new ConnectionManager(repository);
    const adapter = new WebSocketAdapter(domain);
    return adapter.handleRequest(event);
}

export { handler };
