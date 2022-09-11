jest.mock("buzzword-aws-keyphrase-service-keyphrase-repository-library");

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../new-connection");
    }).rejects.toThrow(new Error("Keyphrase table name has not been set."));
});
