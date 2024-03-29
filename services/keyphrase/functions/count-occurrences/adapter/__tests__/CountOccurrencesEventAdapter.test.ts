import { mock } from "jest-mock-extended";

import { CountOccurrencesEventAdapter } from "../CountOccurrencesEventAdapter";
import CountOccurrencesEvent from "../../types/CountOccurrencesEvent";
import CountOccurrencesPort from "../../ports/CountOccurrencesPort";

const VALID_URL = new URL("https://www.example.com/");

const mockPort = mock<CountOccurrencesPort>();

const adapter = new CountOccurrencesEventAdapter(mockPort);

function createEvent(
    baseURL?: string,
    pathname?: string,
    keyphrases?: string[][]
): Partial<CountOccurrencesEvent> {
    return {
        baseURL,
        pathname,
        keyphrases,
    };
}

function create2DArray<T>(rows: number): T[][] {
    const result: T[][] = [];

    for (let i = 0; i < rows; i++) {
        result[i] = [];
    }

    return result;
}

beforeEach(() => {
    mockPort.countOccurrences.mockReset();
});

test.each([
    [
        "a missing URL",
        createEvent(undefined, VALID_URL.pathname, create2DArray(1)),
    ],
    [
        "an invalid URL (spaces)",
        createEvent("i am invalid", VALID_URL.pathname, create2DArray(1)),
    ],
    [
        "an invalid URL (numeric)",
        createEvent("1", VALID_URL.pathname, create2DArray(1)),
    ],
    [
        "a missing pathname",
        createEvent(VALID_URL.hostname, undefined, create2DArray(1)),
    ],
    [
        "an invalid pathname (missing leading forward slash)",
        createEvent(VALID_URL.hostname, "no forward", create2DArray(1)),
    ],
])(
    "throws an exception given an invalid event with %s",
    async (message: string, event: Partial<CountOccurrencesEvent>) => {
        expect.assertions(1);
        await expect(adapter.handleEvent(event)).rejects.toEqual(
            expect.objectContaining({
                message: expect.stringContaining(
                    "Exception occurred during event validation:"
                ),
            })
        );
    }
);

test.each([
    ["includes protocol", VALID_URL.origin, VALID_URL.pathname, VALID_URL],
    ["excludes protocol", VALID_URL.hostname, VALID_URL.pathname, VALID_URL],
])(
    "calls the port with provided valid URL (%s)",
    async (
        message: string,
        baseURL: string,
        pathname: string,
        expected: URL
    ) => {
        mockPort.countOccurrences.mockResolvedValue(true);
        const event = createEvent(baseURL, pathname, create2DArray(1));

        await adapter.handleEvent(event);

        expect(mockPort.countOccurrences).toHaveBeenCalledTimes(1);
        expect(mockPort.countOccurrences).toHaveBeenCalledWith(
            expected,
            expect.anything()
        );
    }
);

test("provides flattened unique set of keyphrases to port given a single row of keyphrases", async () => {
    const input = create2DArray<string>(1);
    input[0] = ["test", "wibble", "test"];
    const expected = new Set(input[0]);
    const event = createEvent(VALID_URL.origin, VALID_URL.pathname, input);
    mockPort.countOccurrences.mockResolvedValue(true);

    await adapter.handleEvent(event);

    expect(mockPort.countOccurrences).toHaveBeenCalledTimes(1);
    expect(mockPort.countOccurrences).toHaveBeenCalledWith(
        expect.anything(),
        expected
    );
});

test("provides flattened unique set of keyphrases to port given a multiple rows of keyphrases", async () => {
    const input = create2DArray<string>(1);
    input[0] = ["test", "wibble"];
    input[1] = ["wibble", "testing"];
    const expected = new Set(["test", "wibble", "testing"]);
    const event = createEvent(VALID_URL.origin, VALID_URL.pathname, input);
    mockPort.countOccurrences.mockResolvedValue(true);

    await adapter.handleEvent(event);

    expect(mockPort.countOccurrences).toHaveBeenCalledTimes(1);
    expect(mockPort.countOccurrences).toHaveBeenCalledWith(
        expect.anything(),
        expected
    );
});

test("returns success if keyphrases are counted successfully", async () => {
    mockPort.countOccurrences.mockResolvedValue(true);
    const event = createEvent(
        VALID_URL.origin,
        VALID_URL.pathname,
        create2DArray(1)
    );

    const actual = await adapter.handleEvent(event);

    expect(actual.success).toBe(true);
});

test("throws an error if unhandled error is thrown while counting occurrences", async () => {
    const expectedError = new Error("test");
    mockPort.countOccurrences.mockRejectedValue(expectedError);
    const event = createEvent(
        VALID_URL.origin,
        VALID_URL.pathname,
        create2DArray(1)
    );

    expect.assertions(1);
    await expect(adapter.handleEvent(event)).rejects.toEqual(expectedError);
});

test("throws an error if the counting of occurrences fails", async () => {
    mockPort.countOccurrences.mockResolvedValue(false);
    const event = createEvent(
        VALID_URL.origin,
        VALID_URL.pathname,
        create2DArray(1)
    );

    expect.assertions(1);
    await expect(adapter.handleEvent(event)).rejects.toEqual(
        expect.objectContaining({
            message: "Failed to count keyphrase occurrences.",
        })
    );
});
