import { mock } from "jest-mock-extended";
import { createMock } from "ts-auto-mock";
import { On, method } from "ts-auto-mock/extension";
import { AppSyncResolverEvent } from "aws-lambda";

import {
    KeyphraseOccurrences,
    PathKeyphraseOccurrences,
    QueryKeyphrasesPort,
} from "../../ports/QueryKeyphrasesPort";
import QueryKeyphrasesAppSyncAdapter from "../QueryKeyphrasesAppSyncAdapter";
import { QueryKeyphrasesArgs } from "../../../../schemas/schema";

const VALID_BASE_URL = "www.example.com";
const VALID_BASE_URL_EVENT = createEvent(VALID_BASE_URL);
const VALID_PATHNAME = "/test";
const VALID_PATH_EVENT = createEvent(VALID_BASE_URL, VALID_PATHNAME);

const mockPort = createMock<QueryKeyphrasesPort>();
const adapter = new QueryKeyphrasesAppSyncAdapter(mockPort);
const mockQueryKeyphrases: jest.Mock = On(mockPort).get(
    method((mock) => mock.queryKeyphrases)
);

function createEvent(
    baseURL: string,
    pathname?: string
): AppSyncResolverEvent<QueryKeyphrasesArgs> {
    const event = mock<AppSyncResolverEvent<QueryKeyphrasesArgs>>();
    event.arguments = {
        baseURL,
        pathname,
    };

    return event;
}

beforeEach(() => {
    mockQueryKeyphrases.mockReset();
});

test("calls the port with the provided base URL", async () => {
    mockQueryKeyphrases.mockResolvedValue([]);

    await adapter.handleQuery(VALID_BASE_URL_EVENT);

    expect(mockPort.queryKeyphrases).toHaveBeenCalledTimes(1);
    expect(mockPort.queryKeyphrases).toHaveBeenCalledWith(
        VALID_BASE_URL,
        undefined
    );
});

test.each([
    ["provided base URL", VALID_BASE_URL_EVENT],
    ["provided pathname", VALID_PATH_EVENT],
])(
    "returns empty array if no keyphrases returned for %s",
    async (
        message: string,
        event: AppSyncResolverEvent<QueryKeyphrasesArgs>
    ) => {
        mockQueryKeyphrases.mockResolvedValue([]);

        const actual = await adapter.handleQuery(event);

        expect(actual).toEqual([]);
    }
);

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
    "overall base URL response mapping given %s",
    (message: string, stored: PathKeyphraseOccurrences[]) => {
        beforeEach(() => {
            mockQueryKeyphrases.mockResolvedValue(stored);
        });

        test("returns the typename for each object", async () => {
            const actual = await adapter.handleQuery(VALID_BASE_URL_EVENT);

            for (const item of actual) {
                expect(item).toEqual(
                    expect.objectContaining({
                        __typename: "SiteOccurrence",
                    })
                );
            }
        });

        test("returns the base URL, path and keyphrase combined as unique ID for each object", async () => {
            const actual = await adapter.handleQuery(VALID_BASE_URL_EVENT);

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
            const actual = await adapter.handleQuery(VALID_BASE_URL_EVENT);

            for (const item of stored) {
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        keyphrase: item.keyphrase,
                    })
                );
            }
        });

        test("returns the number of occurrences each keyphrase returned was found on provided base URL", async () => {
            const actual = await adapter.handleQuery(VALID_BASE_URL_EVENT);

            for (const item of stored) {
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        occurrences: item.occurrences,
                    })
                );
            }
        });

        test("returns the path each keyphrase returned was found on provided base URL", async () => {
            const actual = await adapter.handleQuery(VALID_BASE_URL_EVENT);

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

test.each([
    ["provided base URL", VALID_BASE_URL_EVENT],
    ["provided pathname", VALID_PATH_EVENT],
])(
    "throws an error if an unexpected error occurs getting the keyphrases for %s",
    async (
        message: string,
        event: AppSyncResolverEvent<QueryKeyphrasesArgs>
    ) => {
        const expectedError = new Error("test error");
        mockQueryKeyphrases.mockRejectedValue(expectedError);

        expect.assertions(1);
        await expect(adapter.handleQuery(event)).rejects.toThrowError(
            expectedError
        );
    }
);

test("only queries port for specific path if provided", async () => {
    mockQueryKeyphrases.mockResolvedValue([]);

    await adapter.handleQuery(VALID_PATH_EVENT);

    expect(mockPort.queryKeyphrases).toHaveBeenCalledTimes(1);
    expect(mockPort.queryKeyphrases).toHaveBeenCalledWith(
        VALID_BASE_URL,
        VALID_PATHNAME
    );
});

describe.each([
    ["a single keyphrase stored", [{ keyphrase: "wibble", occurrences: 15 }]],
    [
        "multiple keyphrases stored",
        [
            { keyphrase: "wibble", occurrences: 15 },
            {
                keyphrase: "dyson sphere",
                occurrences: 11,
            },
        ],
    ],
])(
    "individual path response mapping given %s",
    (message: string, stored: KeyphraseOccurrences[]) => {
        beforeEach(() => {
            mockQueryKeyphrases.mockResolvedValue(stored);
        });

        test("returns the typename for each object", async () => {
            const actual = await adapter.handleQuery(VALID_PATH_EVENT);

            for (const item of actual) {
                expect(item).toEqual(
                    expect.objectContaining({
                        __typename: "PathOccurrence",
                    })
                );
            }
        });

        test("returns the provided base URL, provided pathname, and keyphrase combined as unique ID for each object", async () => {
            const actual = await adapter.handleQuery(VALID_PATH_EVENT);

            for (const item of stored) {
                const expectedID = `${VALID_BASE_URL}${VALID_PATHNAME}#${item.keyphrase}`;
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        id: expectedID,
                    })
                );
            }
        });

        test("returns the actual keyphrase analyzed on provided base URL for each occurrence returned", async () => {
            const actual = await adapter.handleQuery(VALID_PATH_EVENT);

            for (const item of stored) {
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        keyphrase: item.keyphrase,
                    })
                );
            }
        });

        test("returns the number of occurrences each keyphrase returned was found on provided base URL", async () => {
            const actual = await adapter.handleQuery(VALID_PATH_EVENT);

            for (const item of stored) {
                expect(actual).toContainEqual(
                    expect.objectContaining({
                        occurrences: item.occurrences,
                    })
                );
            }
        });
    }
);
