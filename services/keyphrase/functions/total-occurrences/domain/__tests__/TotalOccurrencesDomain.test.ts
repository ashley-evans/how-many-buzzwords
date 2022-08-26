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

beforeEach(() => {
    mockRepository.addOccurrencesToTotals.mockReset();
});

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

test("returns success if updating totals in repository succeeds", async () => {
    mockRepository.addOccurrencesToTotals.mockResolvedValue(true);
    const item: KeyphraseOccurrencesItem = {
        current: createSiteOccurrence(VALID_URL, "dyson", 15),
    };

    const actual = await domain.updateTotal([item]);

    expect(actual).toBe(true);
});

test("returns failure if updating totals in repository fails", async () => {
    mockRepository.addOccurrencesToTotals.mockResolvedValue(false);
    const item: KeyphraseOccurrencesItem = {
        current: createSiteOccurrence(VALID_URL, "dyson", 15),
    };

    const actual = await domain.updateTotal([item]);

    expect(actual).toBe(false);
});

test("returns failure if an unhandldd exception occurs while updating totals in repository", async () => {
    mockRepository.addOccurrencesToTotals.mockRejectedValue(new Error());
    const item: KeyphraseOccurrencesItem = {
        current: createSiteOccurrence(VALID_URL, "dyson", 15),
    };

    const actual = await domain.updateTotal([item]);

    expect(actual).toBe(false);
});

test.each([
    [
        "a single item that has",
        [
            {
                current: createSiteOccurrence(VALID_URL, "dyson", 15),
            },
        ],
    ],
    [
        "multiple items that have",
        [
            {
                current: createSiteOccurrence(VALID_URL, "dyson", 15),
            },
            {
                current: createSiteOccurrence(VALID_URL, "test", 2),
            },
        ],
    ],
])(
    "calls repository to add all occurrences to total given %s no previous state",
    async (message: string, items: KeyphraseOccurrencesItem[]) => {
        const expected = items.map((item) => item.current);
        mockRepository.addOccurrencesToTotals.mockResolvedValue(true);

        await domain.updateTotal(items);

        expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledTimes(1);
        expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledWith(
            expected
        );
    }
);
