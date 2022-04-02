import { mockClient } from "aws-sdk-client-mock";
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
    PostToConnectionCommandOutput,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { SinonSpyCall } from "sinon";

import AWSWebSocketClient from "../AWSWebSocketClient";

const EXPECTED_ENDPOINT = new URL("https://www.test.com/");
const EXPECTED_CONNECTION_ID = "test_id";

const awsMockClient = mockClient(ApiGatewayManagementApiClient);

const client = new AWSWebSocketClient(EXPECTED_ENDPOINT);

describe.each([
    ["string", "test"],
    ["JSON object", JSON.stringify({ test: "test" })],
])(
    "calls endpoint with %s provided",
    (message: string, expectedData: string) => {
        let response: boolean;
        let clientCalls: SinonSpyCall<
            [PostToConnectionCommand],
            Promise<PostToConnectionCommandOutput>
        >[];

        beforeAll(async () => {
            awsMockClient.reset();

            response = await client.sendData(
                expectedData,
                EXPECTED_CONNECTION_ID
            );
            clientCalls = awsMockClient.commandCalls(PostToConnectionCommand);
        });

        test("calls the endpoint once to send the data", () => {
            expect(clientCalls).toHaveLength(1);
            expect(clientCalls[0].args).toHaveLength(1);
        });

        test("sends the provided information to the endpoint", () => {
            const input = clientCalls[0].args[0].input;
            expect(Buffer.from(input.Data as Uint8Array).toString()).toEqual(
                expectedData
            );
        });

        test("sends the provided connection ID to the endpoint", () => {
            const input = clientCalls[0].args[0].input;
            expect(input.ConnectionId).toEqual(EXPECTED_CONNECTION_ID);
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });
    }
);
