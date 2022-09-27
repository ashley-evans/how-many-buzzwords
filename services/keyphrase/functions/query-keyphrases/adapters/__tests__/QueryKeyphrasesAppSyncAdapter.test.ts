import { mock } from "jest-mock-extended";
import { AppSyncResolverEvent } from "aws-lambda";

import {
    PathKeyphraseOccurrences,
    QueryKeyphrasesPort,
} from "../../ports/QueryKeyphrasesPort";
import QueryKeyphrasesAppSyncAdapter from "../QueryKeyphrasesAppSyncAdapter";
import { QueryKeyphrasesArgs } from "../../../../schemas/schema";

const VALID_BASE_URL = "www.example.com";
const VALID_EVENT = createEvent(VALID_BASE_URL);

const mockPort = mock<QueryKeyphrasesPort>();
const adapter = new QueryKeyphrasesAppSyncAdapter(mockPort);

function createEvent(
    baseURL: string
): AppSyncResolverEvent<QueryKeyphrasesArgs> {
    const event = mock<AppSyncResolverEvent<QueryKeyphrasesArgs>>();
    event.arguments = {
        baseURL: baseURL,
    };

    return event;
}

beforeEach(() => {
    mockPort.queryKeyphrases.mockReset();
});

test("calls the port with the provided base URL", async () => {
    mockPort.queryKeyphrases.mockResolvedValue([]);

    await adapter.handleQuery(VALID_EVENT);

    expect(mockPort.queryKeyphrases).toHaveBeenCalledTimes(1);
    expect(mockPort.queryKeyphrases).toHaveBeenCalledWith(VALID_BASE_URL);
});

test("returns empty array if no keyphrases returned", async () => {
    mockPort.queryKeyphrases.mockResolvedValue([]);

    const actual = await adapter.handleQuery(VALID_EVENT);

    expect(actual).toEqual([]);
});

describe.each([
    [
        "a single keyphrase stored",
        [{ keyphrase: "wibble", pathname: "/test", occurrences: 15 }],
    ],
    [
        "multiple keyphrases stored",
        [
            { keyphrase: "wibble", pathname: "/test", occurrences: 15 },
            {
                keyphrase: "dyson sphere",
                pathname: "/program",
                occurrences: 11,
            },
        ],
    ],
])(
    "response mapping given %s",
    (message: string, stored: PathKeyphraseOccurrences[]) => {
        beforeEach(() => {
            mockPort.queryKeyphrases.mockResolvedValue(stored);
        });

        test("returns the base URL, path and keyphrase combined as unique ID for each object", async () => {
            const actual = await adapter.handleQuery(VALID_EVENT);

            for (const item of stored) {
                const expectedID = `${VALID_BASE_URL}${item.pathname}#${item.keyphrase}`;
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        id: expectedID,
                    })
                );
            }
        });

        test("returns the actual keyphrase analyzed on provided base URL for each occurrence returned", async () => {
            const actual = await adapter.handleQuery(VALID_EVENT);

            for (const item of stored) {
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        keyphrase: item.keyphrase,
                    })
                );
            }
        });

        test("returns the number of occurrences each keyphrase returned was found on provided base URL", async () => {
            const actual = await adapter.handleQuery(VALID_EVENT);

            for (const item of stored) {
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        occurrences: item.occurrences,
                    })
                );
            }
        });

        test("returns the path each keyphrase returned was found on provided base URL", async () => {
            const actual = await adapter.handleQuery(VALID_EVENT);

            for (const item of stored) {
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        pathname: item.pathname,
                    })
                );
            }
        });
    }
);

test("throws an error if an unexpected error occurs getting the keyphrases for a provided base URL", async () => {
    const expectedError = new Error("test error");
    mockPort.queryKeyphrases.mockRejectedValue(expectedError);

    expect.assertions(1);
    await expect(adapter.handleQuery(VALID_EVENT)).rejects.toThrowError(
        expectedError
    );
});
