import WebSocketClient from "./WebSocketClient";

interface WebSocketClientFactory {
    createClient(endpoint: URL): WebSocketClient;
}

export default WebSocketClientFactory;
