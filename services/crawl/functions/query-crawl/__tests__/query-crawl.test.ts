const STATE_MACHINE_ARN = "test_state_machine_arn";
const VALID_DEFAULT_LIMIT = 5;

beforeEach(() => {
    process.env.CRAWL_STATE_MACHINE_ARN = STATE_MACHINE_ARN;
    process.env.DEFAULT_LIMIT = VALID_DEFAULT_LIMIT.toString();
});

test("throws error if crawl state machine ARN is undefined", async () => {
    delete process.env.CRAWL_STATE_MACHINE_ARN;

    await expect(async () => {
        await import("../query-crawl");
    }).rejects.toThrow(new Error("Crawl State Machine ARN has not been set."));
});

test("throws error if default limit is undefined", async () => {
    delete process.env.DEFAULT_LIMIT;

    await expect(async () => {
        await import("../query-crawl");
    }).rejects.toThrow(new Error("Default limit has not been set."));
});

test("throws error if default limit is not a number", async () => {
    process.env.DEFAULT_LIMIT = "Not a valid default limit";

    await expect(async () => {
        await import("../query-crawl");
    }).rejects.toThrow(new Error("Provided Default limit is not an integer."));
});
