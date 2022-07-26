jest.mock("buzzword-aws-crawl-urls-repository-library");

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../update-status");
    }).rejects.toThrow(new Error("URLs table name has not been set."));
});
