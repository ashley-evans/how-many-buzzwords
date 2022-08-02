jest.mock("buzzword-aws-text-repository-library");

beforeEach(() => {
    process.env.CRAWL_SERVICE_REST_ENDPOINT = "https://www.example.com/";
    process.env.PARSED_CONTENT_S3_BUCKET_NAME = "test_bucket_name";
});

test("throws error if crawl service rest endpoint is undefined", async () => {
    delete process.env.CRAWL_SERVICE_REST_ENDPOINT;

    expect.assertions(1);
    await expect(async () => {
        await import("../scrape-url");
    }).rejects.toThrow(
        new Error("Crawl Service REST endpoint has not been set.")
    );
});

test("throws error if crawl service rest endpoint is not a valid URL", async () => {
    process.env.CRAWL_SERVICE_REST_ENDPOINT = "not a valid URL";

    expect.assertions(1);
    await expect(async () => {
        await import("../scrape-url");
    }).rejects.toThrow(new Error("Crawl Service REST endpoint is invalid."));
});

test("throws error if parsed content S3 bucket name is undefined", async () => {
    delete process.env.PARSED_CONTENT_S3_BUCKET_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../scrape-url");
    }).rejects.toThrow(new Error("Parsed Content S3 bucket has not been set."));
});
