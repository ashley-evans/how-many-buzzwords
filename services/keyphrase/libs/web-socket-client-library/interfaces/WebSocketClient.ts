interface WebSocketClient {
    getConfiguredEndpoint(): URL;
    sendData(data: string, connectionID: string): Promise<boolean>;
    sendData(data: string, connectionIDs: string[]): Promise<string[]>;
}

export default WebSocketClient;
