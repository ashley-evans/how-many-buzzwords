import { mock } from "jest-mock-extended";
import {
    Repository,
    SiteKeyphraseOccurrences,
} from "buzzword-aws-keyphrase-repository-library";

import TotalOccurrencesDomain from "../TotalOccurrencesDomain";
import { KeyphraseOccurrencesItem } from "../../ports/TotalOccurrencesPort";

const mockRepository = mock<Repository>();

const domain = new TotalOccurrencesDomain(mockRepository);

function createSiteOccurrence(
    url: URL,
    keyphrase: string,
    occurrences: number
): SiteKeyphraseOccurrences {
    return {
        baseURL: url.hostname,
        pathname: url.pathname,
        keyphrase,
        occurrences,
    };
}

const VALID_URL = new URL("https://www.example.com/");

describe("handles no items", () => {
    test("returns success if called with an no items to total", async () => {
        const actual = await domain.updateTotal([]);

        expect(actual).toBe(true);
    });

    test("does not call repository to total any items", async () => {
        await domain.updateTotal([]);

        expect(mockRepository.addOccurrencesToTotals).not.toHaveBeenCalled();
    });
});

test("returns success if totalling succeeds for a single item that has no previous state", async () => {
    mockRepository.addOccurrencesToTotals.mockResolvedValue(true);
    const item: KeyphraseOccurrencesItem = {
        current: createSiteOccurrence(VALID_URL, "dyson", 15),
    };

    const actual = await domain.updateTotal([item]);

    expect(actual).toBe(true);
});

test("calls repository to add all occurrences to total given a single item that has no previous state", async () => {
    mockRepository.addOccurrencesToTotals.mockResolvedValue(true);
    const item: KeyphraseOccurrencesItem = {
        current: createSiteOccurrence(VALID_URL, "dyson", 15),
    };

    await domain.updateTotal([item]);

    expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledWith(
        item.current
    );
});
