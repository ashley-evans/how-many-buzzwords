jest.mock("buzzword-aws-keyphrase-repository-library");
jest.mock("buzzword-aws-text-repository-library");

import { mock } from "jest-mock-extended";

import { handler } from "../find-keyphrases";
import { KeyphrasesEvent } from "../ports/KeyphrasePrimaryAdapter";

const mockEvent = mock<KeyphrasesEvent>();

beforeEach(() => {
    process.env.KEYPHRASE_TABLE_NAME = "keyphrase_table";
    process.env.PARSED_CONTENT_S3_BUCKET_NAME = "test_bucket_name";
});

test("throws error if keyphrases table name is undefined", async () => {
    delete process.env.KEYPHRASE_TABLE_NAME;

    await expect(handler(mockEvent)).rejects.toThrow(
        new Error("Keyphrases Table Name has not been set.")
    );
});

test("throws error if parsed content S3 bucket name is undefined", async () => {
    delete process.env.PARSED_CONTENT_S3_BUCKET_NAME;

    await expect(handler(mockEvent)).rejects.toThrow(
        new Error("Parsed Content S3 bucket has not been set.")
    );
});
