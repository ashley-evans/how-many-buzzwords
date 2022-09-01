import React from "react";
import { render, waitFor, within, fireEvent } from "@testing-library/react";
import { mock } from "jest-mock-extended";
import { from } from "rxjs";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import path from "path";

import { mockComponent } from "./helpers/utils";
import KeyphraseServiceClientFactory from "../../clients/interfaces/KeyphraseServiceClientFactory";
import {
    KeyphraseServiceClient,
    PathnameOccurrences,
} from "../../clients/interfaces/KeyphraseServiceClient";
import ResultConstants from "../../enums/Constants";
import { UniqueOccurrenceKey } from "../../types/UniqueOccurrenceKey";

const mockKeyphraseCloud = jest.fn();
mockComponent(path.join(__dirname, "..", "KeyphraseCloud"), mockKeyphraseCloud);
const mockKeyphraseCirclePacking = jest.fn();
mockComponent(
    path.join(__dirname, "..", "KeyphraseCirclePacking"),
    mockKeyphraseCirclePacking
);

import Results from "../Results";

const VALID_URL = "http://www.example.com/";

const mockKeyphraseClientFactory = mock<KeyphraseServiceClientFactory>();
const mockKeyphraseClient = mock<KeyphraseServiceClient>();

beforeEach(() => {
    mockKeyphraseClient.disconnect.mockClear();
    mockKeyphraseClient.getConfiguredEndpoint.mockClear();
    mockKeyphraseClient.observeKeyphraseResults.mockClear();
    mockKeyphraseClientFactory.createClient.mockClear();
    mockKeyphraseCloud.mockClear();
    mockKeyphraseCirclePacking.mockClear();

    mockKeyphraseClientFactory.createClient.mockReturnValue(
        mockKeyphraseClient
    );
});

function renderWithRouter(component: React.ReactNode, url?: string) {
    return render(
        <MemoryRouter initialEntries={[`/results/${url}`]}>
            <Routes>
                <Route index element={<p />} />
                <Route path="results" element={component}>
                    <Route path=":url" element={component} />
                </Route>
            </Routes>
        </MemoryRouter>
    );
}

function generateOccurrences(numberToGenerate: number) {
    const result: PathnameOccurrences[] = [];
    for (let i = 1; i <= numberToGenerate; i++) {
        const keyphrase = `keyphrase-${i}`;
        result.push(
            {
                pathname: ResultConstants.TOTAL,
                keyphrase,
                occurrences: i,
            },
            {
                pathname: "/dyson",
                keyphrase,
                occurrences: i,
            }
        );
    }

    return result;
}

test.each([
    ["missing url", undefined],
    ["invalid encoded url", encodeURIComponent("not a valid URL")],
    ["invalid encoded url (IP)", encodeURIComponent(0)],
])(
    "does not create a client to listen to keyphrase occurrence results given an %s",
    (_message: string, url?: string) => {
        renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            url
        );

        expect(mockKeyphraseClientFactory.createClient).toHaveBeenCalledTimes(
            0
        );
    }
);

describe("given valid encoded url", () => {
    const AWAITING_RESULTS_MESSAGE = "Awaiting results...";
    const EXPECTED_EXPAND_ROW_TEXT = "Expand row";
    const EXPECTED_OCCURRENCE_HEADER_NAME = "Occurrences caret-up caret-down";

    beforeEach(() => {
        mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(from([]));
    });

    test("creates a client to listen to keyphrase occurrence results", async () => {
        renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            encodeURIComponent(VALID_URL)
        );

        expect(mockKeyphraseClientFactory.createClient).toHaveBeenCalledTimes(
            1
        );
        expect(mockKeyphraseClientFactory.createClient).toHaveBeenCalledWith(
            new URL(VALID_URL)
        );
    });

    test("renders results header", () => {
        const expectedHeader = `Results for: ${VALID_URL}`;

        const { getByRole } = renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            encodeURIComponent(VALID_URL)
        );

        expect(
            getByRole("heading", { name: expectedHeader })
        ).toBeInTheDocument();
    });

    test("renders return link", () => {
        const expectedLinkText = "Return to search";

        const { getByRole } = renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            encodeURIComponent(VALID_URL)
        );

        expect(
            getByRole("link", { name: expectedLinkText })
        ).toBeInTheDocument();
    });

    test("displays awaiting results message if no keyphrases returned", async () => {
        const { getByText } = renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            encodeURIComponent(VALID_URL)
        );

        await waitFor(() =>
            expect(getByText(AWAITING_RESULTS_MESSAGE)).toBeInTheDocument()
        );
    });

    test("provides no occurrences to keyphrase circle packing if no keyphrase occurrences returned", async () => {
        mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(from([]));

        const { queryByText } = renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            encodeURIComponent(VALID_URL)
        );
        await waitFor(() =>
            expect(queryByText(AWAITING_RESULTS_MESSAGE)).toBeInTheDocument()
        );

        expect(mockKeyphraseCirclePacking).toHaveBeenLastCalledWith({
            occurrences: {},
            url: new URL(VALID_URL),
        });
    });

    test.each([
        [
            "returned occurrences",
            "multiple keyphrase occurences returned",
            [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "test",
                    occurrences: 15,
                },
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "wibble",
                    occurrences: 20,
                },
            ],
            {
                [`${ResultConstants.TOTAL}#test`]: 15,
                [`${ResultConstants.TOTAL}#wibble`]: 20,
            },
        ],
        [
            "latest occurrence value returned",
            "multiple keyphrase occurrences received for same path and keyphrase combination",
            [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "test",
                    occurrences: 15,
                },
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "test",
                    occurrences: 20,
                },
            ],
            {
                [`${ResultConstants.TOTAL}#test`]: 20,
            },
        ],
    ])(
        "provides %s to keyphrase circle packing if %s",
        async (
            expectedMessage: string,
            inputMessage: string,
            occurrences: PathnameOccurrences[],
            expected: Record<UniqueOccurrenceKey, number>
        ) => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(occurrences)
            );

            const { queryByText } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );

            expect(mockKeyphraseCirclePacking).toHaveBeenLastCalledWith({
                occurrences: expected,
                url: new URL(VALID_URL),
            });
        }
    );

    test.each([
        ["no keyphrases returned", []],
        [
            "no total occurrences returned",
            [{ pathname: "/test", keyphrase: "wibble", occurrences: 15 }],
        ],
    ])(
        "provides no keyphrases to keyphrase cloud if %s",
        async (message: string, occurrences: PathnameOccurrences[]) => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(occurrences)
            );

            const { queryByText } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).toBeInTheDocument()
            );

            expect(mockKeyphraseCloud).toHaveBeenLastCalledWith({
                occurrences: {},
            });
        }
    );

    test.each([
        [
            "total",
            "a single total occurrence",
            [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "wibble",
                    occurrences: 15,
                },
            ],
            { wibble: 15 },
        ],
        [
            "multiple different totals",
            "multiple different total occurrences",
            [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "wibble",
                    occurrences: 15,
                },
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "test",
                    occurrences: 12,
                },
            ],
            { wibble: 15, test: 12 },
        ],
        [
            "the most recent total",
            "multiple of the same total occurrence",
            [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "wibble",
                    occurrences: 15,
                },
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "wibble",
                    occurrences: 20,
                },
            ],
            { wibble: 20 },
        ],
    ])(
        "provides %s to keyphrase cloud given %s returned",
        async (
            expectedMessage: string,
            inputMessage: string,
            inputOccurrences: PathnameOccurrences[],
            expectedOccurrences: Record<string, number>
        ) => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(inputOccurrences)
            );

            const { queryByText } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );

            expect(mockKeyphraseCloud).toHaveBeenLastCalledWith({
                occurrences: expectedOccurrences,
            });
        }
    );

    describe.each([
        [
            "a single non-total keyphrase occurrence",
            [{ pathname: "/test", keyphrase: "wibble", occurrences: 15 }],
        ],
        [
            "multiple non-total keyphrase occurrences",
            [
                { pathname: "/test", keyphrase: "wibble", occurrences: 15 },
                { pathname: "/wibble", keyphrase: "test", occurrences: 12 },
            ],
        ],
    ])(
        "missing total row rendering given %s",
        (message: string, occurrences: PathnameOccurrences[]) => {
            beforeEach(() => {
                mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                    from(occurrences)
                );
            });

            test("renders awaiting message", async () => {
                const { getByText } = renderWithRouter(
                    <Results
                        keyphraseServiceClientFactory={
                            mockKeyphraseClientFactory
                        }
                    />,
                    encodeURIComponent(VALID_URL)
                );

                await waitFor(() =>
                    expect(
                        getByText(AWAITING_RESULTS_MESSAGE)
                    ).toBeInTheDocument()
                );
            });

            test("does not render any of the occurrences", async () => {
                const { getByText, getByRole } = renderWithRouter(
                    <Results
                        keyphraseServiceClientFactory={
                            mockKeyphraseClientFactory
                        }
                    />,
                    encodeURIComponent(VALID_URL)
                );
                await waitFor(() =>
                    expect(
                        getByText(AWAITING_RESULTS_MESSAGE)
                    ).toBeInTheDocument()
                );
                const table = getByRole("table");

                for (const occurrence of occurrences) {
                    expect(
                        within(table).queryByRole("cell", {
                            name: occurrence.keyphrase,
                        })
                    ).not.toBeInTheDocument();
                    expect(
                        within(table).queryByRole("cell", {
                            name: occurrence.pathname,
                        })
                    ).not.toBeInTheDocument();
                    expect(
                        within(table).queryByRole("cell", {
                            name: occurrence.occurrences.toString(),
                        })
                    ).not.toBeInTheDocument();
                }
            });
        }
    );

    describe.each([
        [
            "a single total occurrence",
            [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "wibble",
                    occurrences: 15,
                },
            ],
        ],
        [
            "multiple total occurrences",
            [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "wibble",
                    occurrences: 15,
                },
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: "wobble",
                    occurrences: 12,
                },
            ],
        ],
    ])(
        "results table rendering given %s",
        (message: string, expectedOccurrences: PathnameOccurrences[]) => {
            beforeEach(() => {
                mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                    from(expectedOccurrences)
                );
            });

            test("renders required table columns", async () => {
                const expectedColumns = [
                    "Pathname",
                    "Keyphrase",
                    EXPECTED_OCCURRENCE_HEADER_NAME,
                ];

                const { queryByText, getByRole } = renderWithRouter(
                    <Results
                        keyphraseServiceClientFactory={
                            mockKeyphraseClientFactory
                        }
                    />,
                    encodeURIComponent(VALID_URL)
                );
                await waitFor(() =>
                    expect(
                        queryByText(AWAITING_RESULTS_MESSAGE)
                    ).not.toBeInTheDocument()
                );
                const table = getByRole("table");

                for (const expectedColumn of expectedColumns) {
                    expect(
                        within(table).getByRole("columnheader", {
                            name: expectedColumn,
                        })
                    ).toBeInTheDocument();
                }
            });

            test("renders each total occurrence in the table", async () => {
                const { queryByText, getByRole } = renderWithRouter(
                    <Results
                        keyphraseServiceClientFactory={
                            mockKeyphraseClientFactory
                        }
                    />,
                    encodeURIComponent(VALID_URL)
                );
                await waitFor(() =>
                    expect(
                        queryByText(AWAITING_RESULTS_MESSAGE)
                    ).not.toBeInTheDocument()
                );
                const table = getByRole("table");

                for (const expectedOccurrence of expectedOccurrences) {
                    expect(
                        within(table).getByRole("cell", {
                            name: expectedOccurrence.keyphrase,
                        })
                    ).toBeInTheDocument();
                    expect(
                        within(table).getByRole("cell", {
                            name: expectedOccurrence.occurrences.toString(),
                        })
                    ).toBeInTheDocument();
                    expect(
                        within(table).queryByRole("cell", {
                            name: ResultConstants.TOTAL,
                        })
                    ).not.toBeInTheDocument();
                }
            });
        }
    );

    test("renders only most recently received total given multiple values received for same keyphrase total", async () => {
        const firstValue: PathnameOccurrences = {
            pathname: ResultConstants.TOTAL,
            keyphrase: "wibble",
            occurrences: 15,
        };
        const secondValue: PathnameOccurrences = {
            ...firstValue,
            occurrences: 18,
        };
        mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
            from([firstValue, secondValue])
        );

        const { queryByText, getByRole } = renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            encodeURIComponent(VALID_URL)
        );
        await waitFor(() =>
            expect(
                queryByText(AWAITING_RESULTS_MESSAGE)
            ).not.toBeInTheDocument()
        );
        const table = getByRole("table");

        await waitFor(() =>
            expect(
                within(table).getByRole("cell", {
                    name: secondValue.keyphrase,
                })
            ).toBeInTheDocument()
        );
        expect(
            within(table).getByRole("cell", {
                name: secondValue.occurrences.toString(),
            })
        ).toBeInTheDocument();
        expect(
            within(table).queryByRole("cell", {
                name: ResultConstants.TOTAL,
            })
        ).not.toBeInTheDocument();
    });

    describe("occurrence breakdown rendering given both site and path occurrences for same keyphrase", () => {
        const EXPECTED_COLLAPSE_ROW_TEXT = "Collapse row";

        const totalOccurrence: PathnameOccurrences = {
            pathname: ResultConstants.TOTAL,
            keyphrase: "test",
            occurrences: 15,
        };
        const pathOccurrences = { ...totalOccurrence, pathname: "wibble" };
        const occurrences = [totalOccurrence, pathOccurrences];

        beforeEach(() => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(occurrences)
            );
        });

        test("does not show breakdown of occurrences by default", async () => {
            const { queryByText, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");

            expect(
                within(table).getByRole("cell", {
                    name: totalOccurrence.keyphrase,
                })
            ).toBeInTheDocument();
            expect(
                within(table).queryByRole("cell", {
                    name: pathOccurrences.pathname,
                })
            ).not.toBeInTheDocument();
        });

        test("renders an expand row button", async () => {
            const { queryByText, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");

            expect(
                within(table).getByRole("button", {
                    name: EXPECTED_EXPAND_ROW_TEXT,
                })
            ).toBeInTheDocument();
        });

        test("renders path occurrences when expand row button is pressed", async () => {
            const { queryByText, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");
            fireEvent.click(
                within(table).getByRole("button", {
                    name: EXPECTED_EXPAND_ROW_TEXT,
                })
            );

            expect(
                within(table).getByRole("cell", {
                    name: pathOccurrences.pathname,
                })
            ).toBeInTheDocument();
        });

        test("does not render total as path occurrence when expand row is pressed", async () => {
            const { queryByText, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");
            fireEvent.click(
                within(table).getByRole("button", {
                    name: EXPECTED_EXPAND_ROW_TEXT,
                })
            );

            expect(
                within(table).queryByRole("cell", {
                    name: totalOccurrence.pathname,
                })
            ).not.toBeInTheDocument();
        });

        test("renders a collapse row button when row is expanded", async () => {
            const { queryByText, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");
            fireEvent.click(
                within(table).getByRole("button", {
                    name: EXPECTED_EXPAND_ROW_TEXT,
                })
            );

            await waitFor(() =>
                expect(
                    within(table).getByRole("button", {
                        name: EXPECTED_COLLAPSE_ROW_TEXT,
                    })
                ).toBeInTheDocument()
            );
        });

        test("hides path occurrences when grouped row is collapsed", async () => {
            const { queryByText, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");
            fireEvent.click(
                within(table).getByRole("button", {
                    name: EXPECTED_EXPAND_ROW_TEXT,
                })
            );
            await waitFor(() =>
                expect(
                    within(table).getByRole("button", {
                        name: EXPECTED_COLLAPSE_ROW_TEXT,
                    })
                ).toBeInTheDocument()
            );
            fireEvent.click(
                within(table).getByRole("button", {
                    name: EXPECTED_COLLAPSE_ROW_TEXT,
                })
            );

            expect(
                within(table).queryByRole("cell", {
                    name: pathOccurrences.pathname,
                })
            ).not.toBeInTheDocument();
        });
    });

    describe("results sorting", () => {
        const expectedLargestKeyphrase = "dyson";
        const expectedSmallestKeyphrase = "wibble";
        const multipleTotals: PathnameOccurrences[] = [
            {
                pathname: ResultConstants.TOTAL,
                keyphrase: expectedSmallestKeyphrase,
                occurrences: 15,
            },
            {
                pathname: "/test",
                keyphrase: expectedSmallestKeyphrase,
                occurrences: 15,
            },
            {
                pathname: ResultConstants.TOTAL,
                keyphrase: expectedLargestKeyphrase,
                occurrences: 20,
            },
            {
                pathname: "/dyson",
                keyphrase: expectedLargestKeyphrase,
                occurrences: 20,
            },
        ];

        test("renders total occurrences in descending order by default", async () => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(multipleTotals)
            );

            const { queryByText, getAllByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const rows = getAllByRole("row");

            expect(
                within(rows[1]).getByRole("cell", {
                    name: expectedLargestKeyphrase,
                })
            ).toBeInTheDocument();
            expect(
                within(rows[2]).getByRole("cell", {
                    name: expectedSmallestKeyphrase,
                })
            ).toBeInTheDocument();
        });

        test("renders path occurrences in descending order by default", async () => {
            const expectedFirstPath = "/test";
            const expectedSecondPath = "/wibble";
            const keyphrase = "test";
            const occurrences: PathnameOccurrences[] = [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase,
                    occurrences: 15,
                },
                {
                    pathname: expectedSecondPath,
                    keyphrase,
                    occurrences: 5,
                },
                {
                    pathname: expectedFirstPath,
                    keyphrase,
                    occurrences: 10,
                },
            ];
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(occurrences)
            );

            const { queryByText, getByRole, getAllByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");
            fireEvent.click(
                within(table).getByRole("button", {
                    name: EXPECTED_EXPAND_ROW_TEXT,
                })
            );

            const rows = getAllByRole("row");
            expect(
                within(rows[2]).getByRole("cell", {
                    name: expectedFirstPath,
                })
            ).toBeInTheDocument();
            expect(
                within(rows[3]).getByRole("cell", {
                    name: expectedSecondPath,
                })
            ).toBeInTheDocument();
        });

        test("can reset occurrence sorting to non-sorted", async () => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(multipleTotals)
            );

            const { queryByText, getAllByRole, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");
            fireEvent.click(
                within(table).getByRole("columnheader", {
                    name: EXPECTED_OCCURRENCE_HEADER_NAME,
                })
            );
            const rows = getAllByRole("row");

            expect(
                within(rows[1]).getByRole("cell", {
                    name: expectedSmallestKeyphrase,
                })
            ).toBeInTheDocument();
            expect(
                within(rows[2]).getByRole("cell", {
                    name: expectedLargestKeyphrase,
                })
            ).toBeInTheDocument();
        });

        test("can sort keyphrases from smallest to largest number of occurrences", async () => {
            const multipleTotals: PathnameOccurrences[] = [
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: expectedLargestKeyphrase,
                    occurrences: 20,
                },
                {
                    pathname: "/dyson",
                    keyphrase: expectedLargestKeyphrase,
                    occurrences: 20,
                },
                {
                    pathname: ResultConstants.TOTAL,
                    keyphrase: expectedSmallestKeyphrase,
                    occurrences: 15,
                },
                {
                    pathname: "/test",
                    keyphrase: expectedSmallestKeyphrase,
                    occurrences: 15,
                },
            ];
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(multipleTotals)
            );

            const { queryByText, getAllByRole, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const table = getByRole("table");
            fireEvent.click(
                within(table).getByRole("columnheader", {
                    name: EXPECTED_OCCURRENCE_HEADER_NAME,
                })
            );
            fireEvent.click(
                within(table).getByRole("columnheader", {
                    name: EXPECTED_OCCURRENCE_HEADER_NAME,
                })
            );
            const rows = getAllByRole("row");

            expect(
                within(rows[1]).getByRole("cell", {
                    name: expectedSmallestKeyphrase,
                })
            ).toBeInTheDocument();
            expect(
                within(rows[2]).getByRole("cell", {
                    name: expectedLargestKeyphrase,
                })
            ).toBeInTheDocument();
        });
    });

    describe("results pagination", () => {
        test("cannot view next results page if only ten items", async () => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(generateOccurrences(10))
            );

            const { queryByText, queryByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );

            expect(queryByRole("button", { name: "right" })).toBeDisabled();
        });

        test("cannot navigate back in list if on first page", async () => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(generateOccurrences(10))
            );

            const { queryByText, queryByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );

            expect(queryByRole("button", { name: "left" })).toBeDisabled();
        });

        test("only renders first ten results if more than ten returned", async () => {
            const occurrences = generateOccurrences(15).reverse();
            const expectedTotals = occurrences.filter(
                (value) => value.pathname == ResultConstants.TOTAL
            );
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(occurrences)
            );

            const { queryByText, getAllByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            const rows = getAllByRole("row");

            expect(rows.length).toEqual(11);
            for (let i = 1; i < rows.length; i++) {
                expect(
                    within(rows[i]).getByRole("cell", {
                        name: expectedTotals[i - 1].keyphrase,
                    })
                ).toBeInTheDocument();
            }
        });

        test("can view remaining results given next button is pressed", async () => {
            const occurrences = generateOccurrences(15).reverse();
            const expectedTotals = occurrences
                .filter((value) => value.pathname == ResultConstants.TOTAL)
                .slice(10);
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(occurrences)
            );

            const { queryByText, getAllByRole, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            fireEvent.click(
                getByRole("button", {
                    name: "right",
                })
            );
            const rows = getAllByRole("row");

            expect(rows.length).toEqual(6);
            for (let i = 1; i < rows.length; i++) {
                expect(
                    within(rows[i]).getByRole("cell", {
                        name: expectedTotals[i - 1].keyphrase,
                    })
                ).toBeInTheDocument();
            }
        });

        test("can return to first page of results given previous button is pressed on subsequent page", async () => {
            const occurrences = generateOccurrences(15);
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(occurrences)
            );

            const { queryByText, getAllByRole, getByRole } = renderWithRouter(
                <Results
                    keyphraseServiceClientFactory={mockKeyphraseClientFactory}
                />,
                encodeURIComponent(VALID_URL)
            );
            await waitFor(() =>
                expect(
                    queryByText(AWAITING_RESULTS_MESSAGE)
                ).not.toBeInTheDocument()
            );
            fireEvent.click(
                getByRole("button", {
                    name: "left",
                })
            );
            const rows = getAllByRole("row");

            expect(rows.length).toEqual(11);
        });
    });
});

test("disconnects keyphrase connection when component is unmounted", () => {
    mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(from([]));

    const { unmount } = renderWithRouter(
        <Results keyphraseServiceClientFactory={mockKeyphraseClientFactory} />,
        encodeURIComponent(VALID_URL)
    );
    unmount();

    expect(mockKeyphraseClient.disconnect).toHaveBeenCalledTimes(1);
});
