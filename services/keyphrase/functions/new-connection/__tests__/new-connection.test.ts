import { mock } from "jest-mock-extended";
import { DynamoDBStreamEvent } from "aws-lambda";

jest.mock("buzzword-aws-keyphrase-repository-library");

import { handler } from "../new-connection";

const mockEvent = mock<DynamoDBStreamEvent>();

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    expect.assertions(1);
    await expect(handler(mockEvent)).rejects.toThrow(
        new Error("Keyphrase table name has not been set.")
    );
});
