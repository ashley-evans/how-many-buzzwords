import { mock } from "jest-mock-extended";
import { CountOccurrencesPort } from "buzzword-aws-count-occurrences-domain";

import { CountOccurrencesEventAdapter } from "../CountOccurrencesEventAdapter";
import CountOccurrencesEvent from "../../types/CountOccurrencesEvent";

const VALID_URL = new URL("https://www.example.com/");

const mockPort = mock<CountOccurrencesPort>();

const adapter = new CountOccurrencesEventAdapter(mockPort);

function createEvent(
    url?: URL | string,
    keyphrases?: string[][]
): Partial<CountOccurrencesEvent> {
    return {
        url: url ? url.toString() : url,
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
    ["a missing URL", createEvent(undefined, create2DArray(1))],
    ["an invalid URL (spaces)", createEvent("i am invalid", create2DArray(1))],
    ["an invalid URL (numeric)", createEvent("1", create2DArray(1))],
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
    ["includes protocol", VALID_URL, VALID_URL],
    ["excludes protocol", VALID_URL.hostname, VALID_URL],
])(
    "calls the port with provided valid URL",
    async (message: string, input: string | URL, expected: URL) => {
        mockPort.countOccurrences.mockResolvedValue(true);
        const event = createEvent(input, create2DArray(1));

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
    const event = createEvent(VALID_URL, input);
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
    const event = createEvent(VALID_URL, input);
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
    const event = createEvent(VALID_URL, create2DArray(1));

    const actual = await adapter.handleEvent(event);

    expect(actual.success).toBe(true);
});
