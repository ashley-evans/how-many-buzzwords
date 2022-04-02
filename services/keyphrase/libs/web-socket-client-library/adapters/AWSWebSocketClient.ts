import { Buffer } from "buffer";
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
    PostToConnectionCommandInput,
} from "@aws-sdk/client-apigatewaymanagementapi";

import WebSocketClient from "../ports/WebSocketClient";

class AWSWebSocketClient implements WebSocketClient {
    private client: ApiGatewayManagementApiClient;

    constructor(endpoint: URL) {
        this.client = new ApiGatewayManagementApiClient({
            endpoint: endpoint.toString(),
        });
    }

    async sendData(data: string, connectionID: string): Promise<boolean> {
        const input: PostToConnectionCommandInput = {
            Data: Buffer.from(data),
            ConnectionId: connectionID,
        };

        await this.client.send(new PostToConnectionCommand(input));

        return true;
    }
}

export default AWSWebSocketClient;
