jest.mock("buzzword-crawl-urls-repository-library");

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    await expect(async () => {
        await import("../get-urls");
    }).rejects.toThrow(new Error("URLs Table Name has not been set."));
});
