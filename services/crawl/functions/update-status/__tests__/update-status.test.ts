jest.mock("buzzword-crawl-urls-repository-library");

beforeEach(() => {
    process.env.TABLE_NAME = "test_table_name";
    process.env.EVENT_BUS_NAME = "test_event_bus_name";
});

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../update-status");
    }).rejects.toThrow(new Error("URLs table name has not been set."));
});

test("throws error if event bus is undefined", async () => {
    delete process.env.EVENT_BUS_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../update-status");
    }).rejects.toThrow(new Error("Crawl event bus name has not been set."));
});
