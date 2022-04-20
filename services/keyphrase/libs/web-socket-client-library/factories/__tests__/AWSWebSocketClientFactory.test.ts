import AWSWebSocketClient from "../../clients/AWSWebSocketClient";
import AWSWebSocketClientFactory from "../AWSWebSocketClientFactory";

const factory = new AWSWebSocketClientFactory();

test("given a valid URL creates a web socket client for that URL", () => {
    const url = new URL("https://www.example.com/");

    const client = factory.createClient(url);

    expect(client).toBeInstanceOf(AWSWebSocketClient);
    expect(client.getConfiguredEndpoint()).toEqual(url);
});
