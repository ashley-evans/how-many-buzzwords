import { mock } from "jest-mock-extended";
import { mockClient } from "aws-sdk-client-mock";
import {
    GetObjectCommand,
    GetObjectCommandOutput,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

import TextS3Repository from "../TextS3Repository";

const mockS3Client = mockClient(S3Client);

const BUCKET_NAME = "test";
const VALID_URL = new URL("http://www.example.com");

const repository = new TextS3Repository(BUCKET_NAME);

function createResponse(text: string): GetObjectCommandOutput {
    const response = mock<GetObjectCommandOutput>();
    response.Body = Readable.from([text]);
    return response;
}

beforeEach(() => {
    mockS3Client.reset();
});

describe("Fetch page text", () => {
    test("calls S3 to get page text", async () => {
        const s3response = createResponse("");
        mockS3Client.on(GetObjectCommand).resolves(s3response);

        await repository.getPageText(VALID_URL);
        const clientCalls = mockS3Client.commandCalls(GetObjectCommand);

        expect(clientCalls).toHaveLength(1);
        expect(clientCalls[0].args).toHaveLength(1);
    });

    test("requests data from the provided S3 bucket", async () => {
        const s3response = createResponse("");
        mockS3Client.on(GetObjectCommand).resolves(s3response);

        await repository.getPageText(VALID_URL);
        const clientCalls = mockS3Client.commandCalls(GetObjectCommand);
        const input = clientCalls[0].args[0].input;

        expect(input).toEqual(
            expect.objectContaining({
                Bucket: BUCKET_NAME,
            })
        );
    });

    test.each([
        ["no pathname", VALID_URL, "www.example.com.txt"],
        [
            "a pathname (no trailing forward slash)",
            new URL("http://www.example.com/test"),
            "www.example.com/test.txt",
        ],
        [
            "a pathname (trailing forward slash)",
            new URL("http://www.example.com/test/"),
            "www.example.com/test.txt",
        ],
        [
            "a pathname with query string parameters",
            new URL("http://www.example.com/test?param=true"),
            "www.example.com/test.txt",
        ],
    ])(
        "requests data using the appropriate key for a URL with %s",
        async (message: string, input: URL, expectedKey: string) => {
            const s3response = createResponse("");
            mockS3Client.on(GetObjectCommand).resolves(s3response);

            await repository.getPageText(input);
            const clientCalls = mockS3Client.commandCalls(GetObjectCommand);
            const s3CallInput = clientCalls[0].args[0].input;

            expect(s3CallInput).toEqual(
                expect.objectContaining({
                    Key: expectedKey,
                })
            );
        }
    );

    test("returns page text", async () => {
        const expectedContent = "test content";
        const s3response = createResponse(expectedContent);
        mockS3Client.on(GetObjectCommand).resolves(s3response);

        const actual = await repository.getPageText(VALID_URL);

        expect(actual).toEqual(expectedContent);
    });

    test("throws error if text retrieval throws an error", async () => {
        const expectedError = new Error("test");
        mockS3Client.on(GetObjectCommand).rejects(expectedError);

        expect.assertions(1);
        await expect(repository.getPageText(VALID_URL)).rejects.toThrow(
            expectedError
        );
    });
});

describe("Store page text", () => {
    test("calls S3 to store page text", async () => {
        await repository.storePageText(VALID_URL, "");
        const clientCalls = mockS3Client.commandCalls(PutObjectCommand);

        expect(clientCalls).toHaveLength(1);
        expect(clientCalls[0].args).toHaveLength(1);
    });

    test("stores page text in the provided bucket", async () => {
        await repository.storePageText(VALID_URL, "");
        const clientCalls = mockS3Client.commandCalls(PutObjectCommand);
        const input = clientCalls[0].args[0].input;

        expect(input).toEqual(
            expect.objectContaining({
                Bucket: BUCKET_NAME,
            })
        );
    });

    test.each([
        ["no pathname", VALID_URL, "www.example.com.txt"],
        [
            "a pathname (no trailing forward slash)",
            new URL("http://www.example.com/test"),
            "www.example.com/test.txt",
        ],
        [
            "a pathname (trailing forward slash)",
            new URL("http://www.example.com/test/"),
            "www.example.com/test.txt",
        ],
        [
            "a pathname with query string parameters",
            new URL("http://www.example.com/test?param=true"),
            "www.example.com/test.txt",
        ],
    ])(
        "stores data using the appropriate key for a URL with %s",
        async (message: string, input: URL, expectedKey: string) => {
            await repository.storePageText(input, "");
            const clientCalls = mockS3Client.commandCalls(PutObjectCommand);
            const s3CallInput = clientCalls[0].args[0].input;

            expect(s3CallInput).toEqual(
                expect.objectContaining({
                    Key: expectedKey,
                })
            );
        }
    );

    test("stores the provided page content", async () => {
        const expectedText = "test content to store";

        await repository.storePageText(VALID_URL, expectedText);
        const clientCalls = mockS3Client.commandCalls(PutObjectCommand);
        const input = clientCalls[0].args[0].input;

        expect(input).toEqual(
            expect.objectContaining({
                Body: expectedText,
            })
        );
    });

    test("returns success if storage succeeds", async () => {
        const actual = await repository.storePageText(VALID_URL, "");

        expect(actual).toBe(true);
    });

    test("returns failure if storage fails", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockS3Client.on(PutObjectCommand).rejects();

        const actual = await repository.storePageText(VALID_URL, "");

        expect(actual).toBe(false);
    });
});
