import { mockClient } from "aws-sdk-client-mock";
import { mock } from "jest-mock-extended";
import {
    ApiGatewayManagementApiClient,
    GoneException,
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

test("returns failure if connection with provided ID is no longer active", async () => {
    awsMockClient.reset();
    const exception = mock<GoneException>();
    exception.name = "GoneException";
    awsMockClient.on(PostToConnectionCommand).rejects(exception);

    const response = await client.sendData("test", EXPECTED_CONNECTION_ID);

    expect(response).toEqual(false);
});

test("throws an exception if an error occurs during data sending", async () => {
    awsMockClient.reset();
    const expectedError = new Error("test");
    awsMockClient.on(PostToConnectionCommand).rejects(expectedError);

    expect.assertions(1);
    await expect(
        client.sendData("test", EXPECTED_CONNECTION_ID)
    ).rejects.toThrow(expectedError);
});

describe.each([
    ["one connection", ["connection_1"]],
    ["multiple connections", ["connection_1", "connection_2"]],
])(
    "calls endpoint with provided data for %s",
    (message: string, connectionIDs: string[]) => {
        const expectedData = "test";

        let response: string[];
        let clientCalls: SinonSpyCall<
            [PostToConnectionCommand],
            Promise<PostToConnectionCommandOutput>
        >[];

        beforeAll(async () => {
            awsMockClient.reset();

            response = await client.sendData(expectedData, connectionIDs);
            clientCalls = awsMockClient.commandCalls(PostToConnectionCommand);
        });

        test("calls the endpoint once per connection ID", () => {
            expect(clientCalls).toHaveLength(connectionIDs.length);
            for (const call of clientCalls) {
                expect(call.args).toHaveLength(1);
            }
        });

        test("provides the given data to each connection ID", () => {
            const inputs = clientCalls.map((call) => call.args[0].input);
            for (const connectionID of connectionIDs) {
                expect(inputs).toContainEqual({
                    Data: Buffer.from(expectedData),
                    ConnectionId: connectionID,
                });
            }
        });

        test("returns no failing connection IDs", () => {
            expect(response).toEqual([]);
        });
    }
);
