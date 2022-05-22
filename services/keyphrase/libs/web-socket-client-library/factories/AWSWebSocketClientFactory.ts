import AWSWebSocketClient from "../clients/AWSWebSocketClient";
import WebSocketClient from "../interfaces/WebSocketClient";
import WebSocketClientFactory from "../interfaces/WebSocketClientFactory";

class AWSWebSocketClientFactory implements WebSocketClientFactory {
    createClient(endpoint: URL): WebSocketClient {
        return new AWSWebSocketClient(endpoint);
    }
}

export default AWSWebSocketClientFactory;
