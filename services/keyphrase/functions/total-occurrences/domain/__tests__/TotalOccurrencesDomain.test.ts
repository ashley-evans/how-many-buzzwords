import { mock } from "jest-mock-extended";
import {
    Repository,
    SiteKeyphraseOccurrences,
} from "buzzword-keyphrase-keyphrase-repository-library";

import TotalOccurrencesDomain from "../TotalOccurrencesDomain";
import {
    OccurrenceItem,
    OccurrenceTotalImage,
    TotalItem,
} from "../../ports/TotalOccurrencesPort";

const mockRepository = mock<Repository>();

const domain = new TotalOccurrencesDomain(mockRepository);

function createOccurrenceImage(
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

function createTotalImage(
    keyphrase: string,
    occurrences: number,
    url?: URL
): OccurrenceTotalImage {
    return {
        baseURL: url ? url.hostname : undefined,
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

test("returns failure if updating totals in repository fails", async () => {
    mockRepository.addOccurrencesToTotals.mockResolvedValue(false);
    const item: OccurrenceItem = {
        current: createOccurrenceImage(VALID_URL, "dyson", 15),
    };

    const actual = await domain.updateTotal([item]);

    expect(actual).toBe(false);
});

test("returns failure if an unhandled exception occurs while updating totals in repository", async () => {
    mockRepository.addOccurrencesToTotals.mockRejectedValue(new Error());
    const item: OccurrenceItem = {
        current: createOccurrenceImage(VALID_URL, "dyson", 15),
    };

    const actual = await domain.updateTotal([item]);

    expect(actual).toBe(false);
});

describe.each([
    [
        "a single occurrence item that has",
        [
            {
                current: createOccurrenceImage(VALID_URL, "dyson", 15),
            },
        ],
    ],
    [
        "multiple occurrence items that have",
        [
            {
                current: createOccurrenceImage(VALID_URL, "dyson", 15),
            },
            {
                current: createOccurrenceImage(VALID_URL, "test", 2),
            },
        ],
    ],
])(
    "total updating given %s no previous state",
    (message: string, items: OccurrenceItem[]) => {
        test("calls repository to add all occurrences to total", async () => {
            const expected = items.map((item) => item.current);
            mockRepository.addOccurrencesToTotals.mockResolvedValue(true);

            await domain.updateTotal(items);

            expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledTimes(
                1
            );
            expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledWith(
                expected
            );
        });

        test("returns success if updating totals in repository succeeds", async () => {
            mockRepository.addOccurrencesToTotals.mockResolvedValue(true);

            const actual = await domain.updateTotal(items);

            expect(actual).toBe(true);
        });
    }
);

describe.each([
    [
        "a single global total",
        [
            {
                current: createTotalImage("test", 12),
            },
        ],
    ],
    [
        "multiple global totals",
        [
            {
                current: createTotalImage("test", 12),
            },
            { current: createTotalImage("wibble", 14) },
        ],
    ],
    [
        "a single site total",
        [
            {
                current: createTotalImage("test", 12, VALID_URL),
            },
        ],
    ],
    [
        "multiple site totals",
        [
            {
                current: createTotalImage("test", 12, VALID_URL),
            },
            { current: createTotalImage("wibble", 14, VALID_URL) },
        ],
    ],
])("total updating given %s", (message: string, items: TotalItem[]) => {
    test("does not call repository to update totals", async () => {
        await domain.updateTotal(items);

        expect(mockRepository.addOccurrencesToTotals).not.toHaveBeenCalled();
    });

    test("returns success", async () => {
        const actual = await domain.updateTotal(items);

        expect(actual).toBe(true);
    });
});

test("only calls repository to update totals with provided occurrence items given both occurrence and total items", async () => {
    const expected = createOccurrenceImage(VALID_URL, "test", 12);
    const items: (OccurrenceItem | TotalItem)[] = [
        {
            current: expected,
        },
        {
            current: createTotalImage("wibble", 12),
        },
    ];
    mockRepository.addOccurrencesToTotals.mockResolvedValue(true);

    await domain.updateTotal(items);

    expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledTimes(1);
    expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledWith([
        expected,
    ]);
});

test.each([
    [
        "a single occurrence item",
        [
            {
                current: createOccurrenceImage(VALID_URL, "test", 5),
                previous: createOccurrenceImage(VALID_URL, "test", 2),
            },
        ],
        [createOccurrenceImage(VALID_URL, "test", 3)],
    ],
    [
        "multiple occurrence items",
        [
            {
                current: createOccurrenceImage(VALID_URL, "test", 5),
                previous: createOccurrenceImage(VALID_URL, "test", 2),
            },
            {
                current: createOccurrenceImage(VALID_URL, "wibble", 3),
                previous: createOccurrenceImage(VALID_URL, "wibble", 2),
            },
        ],
        [
            createOccurrenceImage(VALID_URL, "test", 3),
            createOccurrenceImage(VALID_URL, "wibble", 1),
        ],
    ],
])(
    "updates totals with different in occurrences given %s with previous state",
    async (
        message: string,
        items: OccurrenceItem[],
        expected: SiteKeyphraseOccurrences[]
    ) => {
        mockRepository.addOccurrencesToTotals.mockResolvedValue(true);

        await domain.updateTotal(items);

        expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledTimes(1);
        expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledWith(
            expect.arrayContaining(expected)
        );
    }
);
