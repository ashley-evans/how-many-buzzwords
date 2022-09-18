jest.mock("@aws-sdk/client-eventbridge");

beforeEach(() => {
    process.env.EVENT_BUS_NAME = "test_event_bus_name";
});

test("throws error if event bus is undefined", async () => {
    delete process.env.EVENT_BUS_NAME;

    expect.assertions(1);
    await expect(async () => {
        await import("../publish-urls");
    }).rejects.toThrow(new Error("Crawl event bus name has not been set."));
});
