import AWSWebSocketClient from "../../clients/AWSWebSocketClient";
import AWSWebSocketClientFactory from "../AWSWebSocketClientFactory";

const factory = new AWSWebSocketClientFactory();

describe("given a valid URL", () => {
    const url = new URL("https://www.example.com/");
    const client = factory.createClient(url);

    test("returns an AWS web socket API client", () => {
        expect(client).toBeInstanceOf(AWSWebSocketClient);
    });

    test("returns a client configured to the provided URL", () => {
        expect(client.getConfiguredEndpoint()).toEqual(url);
    });
});
