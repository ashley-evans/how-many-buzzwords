jest.mock("buzzword-aws-keyphrase-repository-library");

beforeEach(() => {
    process.env.KEYPHRASE_TABLE_NAME = "test_keyphrase_table";
});

test("throws error if keyphrase table name is undefined", async () => {
    delete process.env.KEYPHRASE_TABLE_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../total-occurrences");
    }).rejects.toThrow(new Error("Keyphrases Table Name has not been set."));
});
