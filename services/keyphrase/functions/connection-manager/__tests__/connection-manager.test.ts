import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

jest.mock("buzzword-aws-active-connections-repository-library");

import { handler } from "../connection-manager";

const mockEvent = mock<APIGatewayProxyEvent>();

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    expect.assertions(1);
    await expect(handler(mockEvent)).rejects.toThrow(
        new Error("Active Connections table name has not been set.")
    );
});
