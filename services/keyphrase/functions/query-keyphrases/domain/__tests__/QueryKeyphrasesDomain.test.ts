import { mock } from "jest-mock-extended";
import { Repository } from "buzzword-keyphrase-keyphrase-repository-library";

import QueryKeyphrasesDomain from "../QueryKeyphrasesDomain";

const EXPECTED_BASE_URL = "www.example.com";

const mockRepository = mock<Repository>();
const domain = new QueryKeyphrasesDomain(mockRepository);

beforeEach(() => {
    mockRepository.getOccurrences.mockReset();
});

describe.each([
    ["a number", "1"],
    ["invalid base URL (space)", "invalid base URL"],
])(
    "invalid base URL handling given a number",
    (message: string, input: string) => {
        test("throws an invalid input error", async () => {
            const expectedErrorMessage = "Invalid base URL provided.";

            expect.assertions(1);
            await expect(domain.queryKeyphrases(input)).rejects.toThrowError(
                expectedErrorMessage
            );
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
    ["includes a protocol", `https://${EXPECTED_BASE_URL}/`, EXPECTED_BASE_URL],
    ["includes a path", `${EXPECTED_BASE_URL}/test`, EXPECTED_BASE_URL],
])(
    "calls the repository to get the keyphrases related to hostname provided base URL that %s",
    async (message: string, input: string, expectedBaseURL: string) => {
        await domain.queryKeyphrases(input);

        expect(mockRepository.getOccurrences).toHaveBeenCalledTimes(1);
        expect(mockRepository.getOccurrences).toHaveBeenCalledWith(
            expectedBaseURL
        );
    }
);

test("returns an empty array if no keyphrases have been found for provided URL", async () => {
    mockRepository.getOccurrences.mockResolvedValue([]);

    const actual = await domain.queryKeyphrases(EXPECTED_BASE_URL);

    expect(actual).toEqual([]);
});

test("throws an error if an unexpected error occurs getting the keyphrases for a provided base URL", async () => {
    const expectedError = new Error("test error");
    mockRepository.getOccurrences.mockRejectedValue(expectedError);

    expect.assertions(1);
    await expect(
        domain.queryKeyphrases(EXPECTED_BASE_URL)
    ).rejects.toThrowError(expectedError);
});
