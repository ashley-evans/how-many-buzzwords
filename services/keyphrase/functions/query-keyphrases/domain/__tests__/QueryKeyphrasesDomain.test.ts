import { mock } from "jest-mock-extended";
import { Repository } from "buzzword-keyphrase-keyphrase-repository-library";

import QueryKeyphrasesDomain from "../QueryKeyphrasesDomain";

const EXPECTED_BASE_URL = "www.example.com";

const mockRepository = mock<Repository>();
const domain = new QueryKeyphrasesDomain(mockRepository);

beforeEach(() => {
    mockRepository.getOccurrences.mockReset();
});

test("calls the repository to get the keyphrases related to provided URL", async () => {
    await domain.queryKeyphrases(EXPECTED_BASE_URL);

    expect(mockRepository.getOccurrences).toHaveBeenCalledTimes(1);
    expect(mockRepository.getOccurrences).toHaveBeenCalledWith(
        EXPECTED_BASE_URL
    );
});

test("returns an empty array if no keyphrases have been found for provided URL", async () => {
    mockRepository.getOccurrences.mockResolvedValue([]);

    const actual = await domain.queryKeyphrases(EXPECTED_BASE_URL);

    expect(actual).toEqual([]);
});
