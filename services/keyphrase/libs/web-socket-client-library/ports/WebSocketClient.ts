interface WebSocketClient {
    sendData(data: string, connectionID: string): Promise<boolean>;
}

export default WebSocketClient;
