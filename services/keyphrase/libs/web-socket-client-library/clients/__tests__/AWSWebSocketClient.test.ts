import { mock } from "jest-mock-extended";
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

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

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

        test("sends the data to the configured endpoint", async () => {
            const configuredEndpoint =
                await clientCalls[0].thisValue.config.endpoint();

            expect(configuredEndpoint).toEqual(
                expect.objectContaining({
                    hostname: EXPECTED_ENDPOINT.hostname,
                    protocol: EXPECTED_ENDPOINT.protocol,
                    path: EXPECTED_ENDPOINT.pathname,
                })
            );
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

test("returns false if connection provided is no longer active", async () => {
    awsMockClient.reset();
    const mockError = mock<Error>();
    mockError.name = "GoneException";
    awsMockClient.on(PostToConnectionCommand).rejects(mockError);

    const response = await client.sendData("test", EXPECTED_CONNECTION_ID);

    expect(response).toEqual(false);
});

test("throws an exception if an unknown error occurs during data sending", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
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

        test("sends the data to the configured endpoint for each request", async () => {
            for (const call of clientCalls) {
                const configuredEndpoint =
                    await call.thisValue.config.endpoint();

                expect(configuredEndpoint).toEqual(
                    expect.objectContaining({
                        hostname: EXPECTED_ENDPOINT.hostname,
                        protocol: EXPECTED_ENDPOINT.protocol,
                        path: EXPECTED_ENDPOINT.pathname,
                    })
                );
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

test("returns no failed connection IDs if request fail due to connection no longer being active", async () => {
    awsMockClient.reset();
    const mockError = mock<Error>();
    mockError.name = "GoneException";
    awsMockClient.on(PostToConnectionCommand).rejects(mockError);

    const response = await client.sendData("test", ["test_1", "test_2"]);

    expect(response).toHaveLength(0);
});

test("returns failed connection Ids if requests fail due to unknown error during data transmission", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const expectedConnectionIDs = ["test_1", "test_2"];

    awsMockClient.reset();
    const expectedError = new Error("test");
    awsMockClient.on(PostToConnectionCommand).rejects(expectedError);

    const response = await client.sendData("test", expectedConnectionIDs);

    expect(response).toHaveLength(expectedConnectionIDs.length);
    expect(response).toEqual(expect.arrayContaining(expectedConnectionIDs));
});

test("returns configured endpoint", () => {
    const expectedEndpoint = new URL("https://www.example.com");
    const client = new AWSWebSocketClient(expectedEndpoint);

    const result = client.getConfiguredEndpoint();

    expect(result).toEqual(expectedEndpoint);
});
