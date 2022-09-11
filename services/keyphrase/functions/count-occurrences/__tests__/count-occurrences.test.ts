jest.mock("buzzword-aws-keyphrase-service-text-repository-library");
jest.mock("buzzword-aws-keyphrase-service-keyphrase-repository-library");

beforeEach(() => {
    process.env.PARSED_CONTENT_S3_BUCKET_NAME = "test_bucket_name";
    process.env.KEYPHRASE_TABLE_NAME = "test_keyphrase_table";
});

test("throws error if parsed content S3 bucket name is undefined", async () => {
    delete process.env.PARSED_CONTENT_S3_BUCKET_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../count-occurrences");
    }).rejects.toThrow(new Error("Parsed Content S3 bucket has not been set."));
});

test("throws error if keyphrase table name is undefined", async () => {
    delete process.env.KEYPHRASE_TABLE_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../count-occurrences");
    }).rejects.toThrow(new Error("Keyphrases Table Name has not been set."));
});
