import { createMock } from "ts-auto-mock";
import { On, method } from "ts-auto-mock/extension";
import {
    Repository,
    PathnameOccurrences,
    KeyphraseTableConstants,
} from "buzzword-keyphrase-keyphrase-repository-library";

import QueryKeyphrasesDomain from "../QueryKeyphrasesDomain";
import { PathKeyphraseOccurrences } from "../../ports/QueryKeyphrasesPort";

const EXPECTED_BASE_URL = "www.example.com";
const EXPECTED_PATH = "/wibble";

const mockRepository = createMock<Repository>();
const mockGetOccurrences: jest.Mock = On(mockRepository).get(
    method((mock) => mock.getOccurrences)
);
const mockGetTotals: jest.Mock = On(mockRepository).get(
    method((mock) => mock.getTotals)
);
const domain = new QueryKeyphrasesDomain(mockRepository);

beforeEach(() => {
    mockGetOccurrences.mockReset();
    mockGetTotals.mockReset();
});

describe("handles obtaining all keyphrase occurrences for a site", () => {
    describe.each([
        ["a number", "1"],
        ["invalid base URL (space)", "invalid base URL"],
    ])(
        "invalid base URL handling given %s",
        (message: string, input: string) => {
            test("throws an invalid input error", async () => {
                const expectedErrorMessage = "Invalid URL provided.";

                expect.assertions(1);
                await expect(
                    domain.queryKeyphrases(input)
                ).rejects.toThrowError(expectedErrorMessage);
            });

            test("does not call port to get keyphrases", async () => {
                try {
                    await domain.queryKeyphrases(input);
                } catch {
                    // Expected Error
                }

                expect(mockRepository.getOccurrences).not.toHaveBeenCalled();
            });
        }
    );

    test.each([
        ["excludes a protocol", EXPECTED_BASE_URL, EXPECTED_BASE_URL],
        [
            "includes a protocol",
            `https://${EXPECTED_BASE_URL}/`,
            EXPECTED_BASE_URL,
        ],
        ["includes a path", `${EXPECTED_BASE_URL}/test`, EXPECTED_BASE_URL],
    ])(
        "calls the repository to get the keyphrases related to hostname provided base URL that %s",
        async (message: string, input: string, expectedBaseURL: string) => {
            mockGetOccurrences.mockResolvedValue([]);

            await domain.queryKeyphrases(input);

            expect(mockRepository.getOccurrences).toHaveBeenCalledTimes(1);
            expect(mockRepository.getOccurrences).toHaveBeenCalledWith(
                expectedBaseURL
            );
        }
    );

    test("returns an empty array if no keyphrases have been found on provided base URL", async () => {
        mockGetOccurrences.mockResolvedValue([]);

        const actual = await domain.queryKeyphrases(EXPECTED_BASE_URL);

        expect(actual).toEqual([]);
    });

    test.each([
        [
            "a single keyphrase has",
            [
                {
                    pathname: "/test",
                    keyphrase: "wibble",
                    occurrences: 12,
                    aggregated: true,
                },
            ],
            [{ pathname: "/test", keyphrase: "wibble", occurrences: 12 }],
        ],
        [
            "multiple keyphrases have",
            [
                {
                    pathname: "/dyson",
                    keyphrase: "sphere",
                    occurrences: 9,
                    aggregated: true,
                },
                {
                    pathname: "/procedural",
                    keyphrase: "code",
                    occurrences: 14,
                    aggregated: false,
                },
            ],
            [
                {
                    pathname: "/dyson",
                    keyphrase: "sphere",
                    occurrences: 9,
                },
                {
                    pathname: "/procedural",
                    keyphrase: "code",
                    occurrences: 14,
                },
            ],
        ],
    ])(
        "returns stored keyphrases if %s been found on provided base URL",
        async (
            message: string,
            stored: PathnameOccurrences[],
            expected: PathKeyphraseOccurrences[]
        ) => {
            mockGetOccurrences.mockResolvedValue(stored);

            const actual = await domain.queryKeyphrases(EXPECTED_BASE_URL);

            expect(actual).toEqual(expected);
        }
    );

    test("throws an error if an unexpected error occurs getting the keyphrases for a provided base URL", async () => {
        const expectedError = new Error("test error");
        mockGetOccurrences.mockRejectedValue(expectedError);

        expect.assertions(1);
        await expect(
            domain.queryKeyphrases(EXPECTED_BASE_URL)
        ).rejects.toThrowError(expectedError);
    });
});

describe("handles obtaining all keyphrases occurrences on a given path of a site", () => {
    describe("invalid pathname handling given a path with a missing forward slash", () => {
        const pathname = "test";
        test("throws an invalid input error", async () => {
            const expectedErrorMessage = "Invalid URL provided.";

            expect.assertions(1);
            await expect(
                domain.queryKeyphrases(EXPECTED_BASE_URL, pathname)
            ).rejects.toThrowError(expectedErrorMessage);
        });

        test("does not call port to get keyphrases", async () => {
            try {
                await domain.queryKeyphrases(EXPECTED_BASE_URL, pathname);
            } catch {
                // Expected Error
            }

            expect(mockRepository.getOccurrences).not.toHaveBeenCalled();
        });
    });

    test("calls repository to get keyphrases on given path of URL", async () => {
        mockGetOccurrences.mockResolvedValue([]);

        await domain.queryKeyphrases(EXPECTED_BASE_URL, EXPECTED_PATH);

        expect(mockRepository.getOccurrences).toHaveBeenCalledTimes(1);
        expect(mockRepository.getOccurrences).toHaveBeenCalledWith(
            EXPECTED_BASE_URL,
            EXPECTED_PATH
        );
    });

    test("returns an empty array if no keyphrases stored against path", async () => {
        mockGetOccurrences.mockResolvedValue([]);

        const actual = await domain.queryKeyphrases(
            EXPECTED_BASE_URL,
            EXPECTED_PATH
        );

        expect(actual).toEqual([]);
    });

    test.each([
        [
            "a single keyphrase has",
            [
                {
                    keyphrase: "wibble",
                    occurrences: 12,
                    aggregated: true,
                },
            ],
            [{ keyphrase: "wibble", occurrences: 12 }],
        ],
        [
            "multiple keyphrases have",
            [
                {
                    keyphrase: "sphere",
                    occurrences: 9,
                    aggregated: true,
                },
                {
                    keyphrase: "code",
                    occurrences: 14,
                    aggregated: false,
                },
            ],
            [
                {
                    keyphrase: "sphere",
                    occurrences: 9,
                },
                {
                    keyphrase: "code",
                    occurrences: 14,
                },
            ],
        ],
    ])(
        "returns stored keyphrases if %s been found on provided path",
        async (message, stored, expected) => {
            mockGetOccurrences.mockResolvedValue(stored);

            const actual = await domain.queryKeyphrases(EXPECTED_BASE_URL);

            expect(actual).toEqual(expected);
        }
    );

    test("throws an error if an unexpected error occurs getting the keyphrases for a provided path", async () => {
        const expectedError = new Error("test error");
        mockGetOccurrences.mockRejectedValue(expectedError);

        expect.assertions(1);
        await expect(
            domain.queryKeyphrases(EXPECTED_BASE_URL, EXPECTED_PATH)
        ).rejects.toThrowError(expectedError);
    });
});

describe("handles obtaining global totals", () => {
    test("calls repository to get global totals given total constant as base URL", async () => {
        mockGetTotals.mockResolvedValue([]);

        await domain.queryKeyphrases(KeyphraseTableConstants.TotalKey);

        expect(mockRepository.getTotals).toHaveBeenCalledTimes(1);
        expect(mockRepository.getTotals).toHaveBeenCalledWith();
    });

    test("returns an empty array if no global totals stored", async () => {
        mockGetTotals.mockResolvedValue([]);

        const actual = await domain.queryKeyphrases(
            KeyphraseTableConstants.TotalKey
        );

        expect(actual).toEqual([]);
    });

    test.each([
        ["one is", [{ keyphrase: "wibble", occurrences: 12 }]],
        [
            "multiple are",
            [
                {
                    keyphrase: "sphere",
                    occurrences: 9,
                },
                {
                    keyphrase: "code",
                    occurrences: 14,
                },
            ],
        ],
    ])("returns stored global totals if %s stored", async (message, totals) => {
        mockGetTotals.mockResolvedValue(totals);

        const actual = await domain.queryKeyphrases(
            KeyphraseTableConstants.TotalKey
        );

        expect(actual).toEqual(totals);
    });

    test("throws an error if an unexpected error occurs getting the global totals", async () => {
        const expectedError = new Error("test error");
        mockGetTotals.mockRejectedValue(expectedError);

        expect.assertions(1);
        await expect(
            domain.queryKeyphrases(KeyphraseTableConstants.TotalKey)
        ).rejects.toThrowError(expectedError);
    });
});

describe("handles obtaining site totals", () => {
    test("calls repository to get site totals given total constant as pathname", async () => {
        mockGetTotals.mockResolvedValue([]);

        await domain.queryKeyphrases(
            EXPECTED_BASE_URL,
            KeyphraseTableConstants.TotalKey
        );

        expect(mockRepository.getTotals).toHaveBeenCalledTimes(1);
        expect(mockRepository.getTotals).toHaveBeenCalledWith(
            EXPECTED_BASE_URL
        );
    });

    test("returns an empty array if no site totals stored", async () => {
        mockGetTotals.mockResolvedValue([]);

        const actual = await domain.queryKeyphrases(
            EXPECTED_BASE_URL,
            KeyphraseTableConstants.TotalKey
        );

        expect(actual).toEqual([]);
    });

    test.each([
        ["one is", [{ keyphrase: "wibble", occurrences: 12 }]],
        [
            "multiple are",
            [
                {
                    keyphrase: "sphere",
                    occurrences: 9,
                },
                {
                    keyphrase: "code",
                    occurrences: 14,
                },
            ],
        ],
    ])("returns stored site totals if %s stored", async (message, totals) => {
        mockGetTotals.mockResolvedValue(totals);

        const actual = await domain.queryKeyphrases(
            EXPECTED_BASE_URL,
            KeyphraseTableConstants.TotalKey
        );

        expect(actual).toEqual(totals);
    });

    test("throws an error if an unexpected error occurs getting the site totals", async () => {
        const expectedError = new Error("test error");
        mockGetTotals.mockRejectedValue(expectedError);

        expect.assertions(1);
        await expect(
            domain.queryKeyphrases(
                EXPECTED_BASE_URL,
                KeyphraseTableConstants.TotalKey
            )
        ).rejects.toThrowError(expectedError);
    });
});
