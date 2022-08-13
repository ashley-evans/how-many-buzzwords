jest.mock("buzzword-aws-text-repository-library");

beforeEach(() => {
    process.env.PARSED_CONTENT_S3_BUCKET_NAME = "test_bucket_name";
});

test("throws error if parsed content S3 bucket name is undefined", async () => {
    delete process.env.PARSED_CONTENT_S3_BUCKET_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../find-keyphrases");
    }).rejects.toThrow(new Error("Parsed Content S3 bucket has not been set."));
});
