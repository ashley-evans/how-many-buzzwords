import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

jest.mock("buzzword-aws-crawl-service-urls-repository-library");

import { handler } from "../get-content";

const mockEvent = mock<APIGatewayProxyEvent>();

test("throws error if content bucket name is undefined", async () => {
    delete process.env.CONTENT_BUCKET_NAME;

    await expect(handler(mockEvent)).rejects.toThrow(
        new Error("Content Bucket Name has not been set.")
    );
});
