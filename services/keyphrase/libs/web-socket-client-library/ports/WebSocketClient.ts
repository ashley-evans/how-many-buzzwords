interface WebSocketClient {
    sendData(data: string, connectionIDs: string | string[]): Promise<boolean>;
}

export default WebSocketClient;
