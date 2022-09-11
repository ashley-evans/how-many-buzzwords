jest.mock(
    "buzzword-aws-keyphrase-service-active-connections-repository-library"
);

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../update-connections");
    }).rejects.toThrow(
        new Error("Active Connections table name has not been set.")
    );
});
