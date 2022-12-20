import { mock } from "jest-mock-extended";
import {
    Repository,
    SiteKeyphraseOccurrences,
    SiteKeyphrase,
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
    occurrences: number,
    aggregated?: boolean
): SiteKeyphraseOccurrences {
    return {
        baseURL: url.hostname,
        pathname: url.pathname,
        keyphrase,
        occurrences,
        aggregated,
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

function extractOccurrenceKeys(items: OccurrenceItem[]): SiteKeyphrase[] {
    return items.map((item) => ({
        baseURL: item.current.baseURL,
        pathname: item.current.pathname,
        keyphrase: item.current.keyphrase,
    }));
}

const VALID_URL = new URL("https://www.example.com/");

beforeEach(() => {
    mockRepository.addOccurrencesToTotals.mockReset();
    mockRepository.setKeyphraseAggregated.mockReset();

    mockRepository.addOccurrencesToTotals.mockResolvedValue([]);
    mockRepository.setKeyphraseAggregated.mockResolvedValue([]);
});

describe("handles no items", () => {
    test("returns no failures if called with an no items to total", async () => {
        const actual = await domain.updateTotal([]);

        expect(actual).toEqual([]);
    });

    test("does not call repository to total any items", async () => {
        await domain.updateTotal([]);

        expect(mockRepository.addOccurrencesToTotals).not.toHaveBeenCalled();
    });
});

test("only returns specific failed items if partial failure occurs while updating totals", async () => {
    const items: OccurrenceItem[] = [
        {
            current: createOccurrenceImage(VALID_URL, "dyson", 12),
        },
        { current: createOccurrenceImage(VALID_URL, "wibble", 11) },
    ];
    const expected = extractOccurrenceKeys([items[0]]);
    mockRepository.addOccurrencesToTotals.mockResolvedValue(expected);

    const actual = await domain.updateTotal(items);

    expect(actual).toEqual(expected);
});

test("returns all items if an unhandled exception occurs while updating totals in repository", async () => {
    mockRepository.addOccurrencesToTotals.mockRejectedValue(new Error());
    const items: OccurrenceItem[] = [
        {
            current: createOccurrenceImage(VALID_URL, "dyson", 12),
        },
        { current: createOccurrenceImage(VALID_URL, "wibble", 11) },
    ];

    const actual = await domain.updateTotal(items);

    expect(actual).toEqual(extractOccurrenceKeys(items));
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

            await domain.updateTotal(items);

            expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledTimes(
                1
            );
            expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledWith(
                expected
            );
        });

        test("returns no failed items if updating totals in repository succeeds", async () => {
            const actual = await domain.updateTotal(items);

            expect(actual).toEqual([]);
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

    test("returns no failed items", async () => {
        const actual = await domain.updateTotal(items);

        expect(actual).toEqual([]);
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
        await domain.updateTotal(items);

        expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledTimes(1);
        expect(mockRepository.addOccurrencesToTotals).toHaveBeenCalledWith(
            expect.arrayContaining(expected)
        );
    }
);

describe.each([
    [
        "a single occurrence item that has",
        [
            {
                current: createOccurrenceImage(VALID_URL, "test", 3),
                previous: createOccurrenceImage(VALID_URL, "test", 3),
            },
        ],
    ],
    [
        "multiple occurrence items that have",
        [
            {
                current: createOccurrenceImage(VALID_URL, "test", 3),
                previous: createOccurrenceImage(VALID_URL, "test", 3),
            },
            {
                current: createOccurrenceImage(VALID_URL, "wibble", 5),
                previous: createOccurrenceImage(VALID_URL, "wibble", 5),
            },
        ],
    ],
])("given %s not changed", (message: string, items: OccurrenceItem[]) => {
    test("does not attempt to add to site and global totals", async () => {
        await domain.updateTotal(items);

        expect(mockRepository.addOccurrencesToTotals).not.toHaveBeenCalled();
    });

    test("sets the aggregated flag for items", async () => {
        const expected = extractOccurrenceKeys(items);

        await domain.updateTotal(items);

        expect(mockRepository.setKeyphraseAggregated).toHaveBeenCalledTimes(1);
        expect(mockRepository.setKeyphraseAggregated).toHaveBeenCalledWith(
            expect.arrayContaining(expected)
        );
    });
});

test("returns all items as failure if updating aggregated flag throws an error", async () => {
    mockRepository.setKeyphraseAggregated.mockRejectedValue(new Error());
    const items = [
        {
            current: createOccurrenceImage(VALID_URL, "test", 3),
            previous: createOccurrenceImage(VALID_URL, "test", 3),
        },
        {
            current: createOccurrenceImage(VALID_URL, "wibble", 4),
            previous: createOccurrenceImage(VALID_URL, "wibble", 4),
        },
    ];

    const actual = await domain.updateTotal(items);

    expect(actual).toEqual(extractOccurrenceKeys(items));
});

test("returns only failed items if updating aggregated flag has partial failures", async () => {
    const items = [
        {
            current: createOccurrenceImage(VALID_URL, "test", 3),
            previous: createOccurrenceImage(VALID_URL, "test", 3),
        },
        {
            current: createOccurrenceImage(VALID_URL, "wibble", 4),
            previous: createOccurrenceImage(VALID_URL, "wibble", 4),
        },
    ];
    const expected = extractOccurrenceKeys([items[0]]);
    mockRepository.setKeyphraseAggregated.mockResolvedValue(expected);

    const actual = await domain.updateTotal(items);

    expect(actual).toEqual(expected);
});

test.each([
    [
        "a single occurrence item",
        [
            {
                current: createOccurrenceImage(VALID_URL, "test", 5, true),
            },
        ],
    ],
    [
        "multiple occurrence items",
        [
            {
                current: createOccurrenceImage(VALID_URL, "test", 5, true),
            },
            {
                current: createOccurrenceImage(VALID_URL, "wibble", 7, true),
            },
        ],
    ],
])(
    "ignores %s if already set to aggregated",
    async (message: string, items: OccurrenceItem[]) => {
        await domain.updateTotal(items);

        expect(mockRepository.addOccurrencesToTotals).not.toHaveBeenCalled();
    }
);
