import React from "react";
import { render, waitFor, within } from "@testing-library/react";
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

const mockKeyphraseCloud = jest.fn();
mockComponent(path.join(__dirname, "..", "KeyphraseCloud"), mockKeyphraseCloud);

import Results from "../Results";
import ResultConstants from "../../enums/Constants";

const VALID_URL = "http://www.example.com/";

const mockKeyphraseClientFactory = mock<KeyphraseServiceClientFactory>();
const mockKeyphraseClient = mock<KeyphraseServiceClient>();

beforeEach(() => {
    mockKeyphraseClient.disconnect.mockClear();
    mockKeyphraseClient.getConfiguredEndpoint.mockClear();
    mockKeyphraseClient.observeKeyphraseResults.mockClear();
    mockKeyphraseClientFactory.createClient.mockClear();
    mockKeyphraseCloud.mockClear();

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

    test("provides no keyphrases to keyphrase cloud if no keyphrases returned", async () => {
        renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            encodeURIComponent(VALID_URL)
        );

        expect(mockKeyphraseCloud).toHaveBeenCalledTimes(1);
        expect(mockKeyphraseCloud).toHaveBeenCalledWith({
            occurrences: {},
        });
    });

    test.each([
        [
            "no values",
            "a single non-total occurrence",
            [{ pathname: "/test", keyphrase: "wibble", occurrences: 15 }],
            {},
        ],
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
            "a single occurrence",
            [
                {
                    pathname: "/test",
                    keyphrase: "wibble",
                    occurrences: 15,
                },
            ],
        ],
        [
            "multiple occurrences",
            [
                {
                    pathname: "/test",
                    keyphrase: "wibble",
                    occurrences: 15,
                },
                {
                    pathname: "/example",
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

            test("renders required columns to contain results from crawl within table", async () => {
                const expectedColumns = [
                    "Pathname",
                    "Keyphrase",
                    "Occurrences",
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

            test("renders each keyphrase result in the table", async () => {
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
                    await waitFor(() =>
                        expect(
                            within(table).getByRole("cell", {
                                name: expectedOccurrence.pathname,
                            })
                        ).toBeInTheDocument()
                    );
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
                }
            });
        }
    );

    test("only most recently received value given multiple values received for same path and keyphrase", async () => {
        const firstValue: PathnameOccurrences = {
            pathname: "/test",
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
                    name: secondValue.pathname,
                })
            ).toBeInTheDocument()
        );
        expect(
            within(table).getByRole("cell", {
                name: secondValue.occurrences.toString(),
            })
        ).toBeInTheDocument();
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
