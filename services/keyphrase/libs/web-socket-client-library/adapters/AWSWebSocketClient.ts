import { Buffer } from "buffer";
import {
    ApiGatewayManagementApiClient,
    GoneException,
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

    sendData(data: string, connectionID: string): Promise<boolean>;
    sendData(data: string, connectionIDs: string[]): Promise<string[]>;

    async sendData(
        data: string,
        connectionIDs: string | string[]
    ): Promise<boolean | string[]> {
        if (Array.isArray(connectionIDs)) {
            const failedTransmissions = [];
            for (const connectionID of connectionIDs) {
                try {
                    await this.sendDataToIndividual(data, connectionID);
                } catch {
                    failedTransmissions.push(connectionID);
                }
            }

            return failedTransmissions;
        }

        return this.sendDataToIndividual(data, connectionIDs);
    }

    private async sendDataToIndividual(
        data: string,
        connectionID: string
    ): Promise<boolean> {
        const input: PostToConnectionCommandInput = {
            Data: Buffer.from(data),
            ConnectionId: connectionID,
        };

        try {
            await this.client.send(new PostToConnectionCommand(input));
            return true;
        } catch (ex) {
            if (this.isGoneException(ex)) {
                return false;
            }

            throw ex;
        }
    }

    private isGoneException(exception: unknown): exception is GoneException {
        return (exception as GoneException).name == "GoneException";
    }
}

export default AWSWebSocketClient;
