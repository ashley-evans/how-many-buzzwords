import { mock } from "jest-mock-extended";
import { TextRepository } from "buzzword-keyphrase-text-repository-library";
import { jest } from "@jest/globals";

import KeyphraseFinder from "../KeyphraseFinder.js";

const VALID_URL = new URL("https://www.example.com/");
const TERM_CONTENT =
    "Terminology mining, term extraction, term recognition, " +
    "or glossary extraction, is a subtask of information extraction. The " +
    "goal of terminology extraction is to automatically extract relevant " +
    "terms from a given corpus.";
const DYSON_CONTENT =
    "A Dyson sphere is a hypothetical megastructure that completely " +
    "encompasses a star and captures a large percentage of its solar power " +
    "output. The concept is a thought experiment that attempts to explain " +
    "how a spacefaring civilization would meet its energy requirements once " +
    "those requirements exceed what can be generated from the home planet's " +
    "resources alone. Because only a tiny fraction of a star's energy " +
    "emissions reaches the surface of any orbiting planet, building structures " +
    "encircling a star would enable a civilization to harvest far more energy";

const mockParsedContentProvider = mock<TextRepository>();

const keyphraseFinder = new KeyphraseFinder(mockParsedContentProvider);

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

beforeEach(() => {
    mockParsedContentProvider.getPageText.mockReset();
});

test("obtains the HTML content for the URL provided", async () => {
    await keyphraseFinder.findKeyphrases(VALID_URL);

    expect(mockParsedContentProvider.getPageText).toHaveBeenCalledTimes(1);
    expect(mockParsedContentProvider.getPageText).toHaveBeenCalledWith(
        VALID_URL
    );
});

test("returns an empty set if no content is returned", async () => {
    const expected = new Set<string>();

    const actual = await keyphraseFinder.findKeyphrases(VALID_URL);

    expect(actual).toEqual(expected);
});

test.each([
    [
        "term",
        TERM_CONTENT,
        [
            "extraction",
            "term",
            "terminology",
            "recognition",
            "glossary",
            "subtask",
            "information",
            "corpus",
            "term extraction",
            "terminology extraction",
            "glossary extraction",
            "information extraction",
            "term recognition",
        ],
    ],
    [
        "dyson sphere",
        DYSON_CONTENT,
        [
            "attempts",
            "civilization",
            "concept",
            "dyson",
            "emissions",
            "energy",
            "energy requirements",
            "experiment",
            "fraction",
            "harvest",
            "home",
            "home planet's resources",
            "megastructure",
            "output",
            "percentage",
            "planet",
            "planet's",
            "power",
            "requirements",
            "resources",
            "sphere",
            "star",
            "star's",
            "star's energy emissions",
            "structures",
            "surface",
            "thought",
        ],
    ],
])(
    "returns expected set of keyphrases given %s parsed content",
    async (message: string, content: string, expectedKeyphrases: string[]) => {
        const expected = new Set(expectedKeyphrases);
        mockParsedContentProvider.getPageText.mockResolvedValue(content);

        const actual = await keyphraseFinder.findKeyphrases(VALID_URL);

        expect(actual).toEqual(expected);
    }
);
