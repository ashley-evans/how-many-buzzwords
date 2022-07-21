import React from "react";
import { render, waitFor, within } from "@testing-library/react";
import { mock } from "jest-mock-extended";
import { from } from "rxjs";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import Results from "../Results";
import KeyphraseServiceClientFactory from "../../clients/interfaces/KeyphraseServiceClientFactory";
import {
    KeyphraseServiceClient,
    PathnameOccurrences,
} from "../../clients/interfaces/KeyphraseServiceClient";

const VALID_URL = "http://www.example.com/";

const mockKeyphraseClientFactory = mock<KeyphraseServiceClientFactory>();
const mockKeyphraseClient = mock<KeyphraseServiceClient>();

beforeEach(() => {
    mockKeyphraseClient.disconnect.mockClear();
    mockKeyphraseClient.getConfiguredEndpoint.mockClear();
    mockKeyphraseClient.observeKeyphraseResults.mockClear();
    mockKeyphraseClientFactory.createClient.mockClear();

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
    (message: string, url?: string) => {
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

    test("renders the title of the site in a header", () => {
        const expectedTitle = "How many buzzwords";

        const { getByRole } = renderWithRouter(
            <Results
                keyphraseServiceClientFactory={mockKeyphraseClientFactory}
            />,
            encodeURIComponent(VALID_URL)
        );

        expect(
            getByRole("heading", { name: expectedTitle })
        ).toBeInTheDocument();
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

    test.each([
        [
            "a single occurrence detail if a single occurrence",
            [
                {
                    pathname: "/test",
                    keyphrase: "wibble",
                    occurrences: 15,
                },
            ],
        ],
        [
            "multiple occurrence details if multiple occurrences",
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
        "renders %s received",
        async (message: string, expectedOccurrences: PathnameOccurrences[]) => {
            mockKeyphraseClient.observeKeyphraseResults.mockReturnValue(
                from(expectedOccurrences)
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
        }
    );
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
