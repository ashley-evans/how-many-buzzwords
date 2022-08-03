import { mock } from "jest-mock-extended";
import { CrawlClient } from "@ashley-evans/buzzword-crawl-client";
import { TextRepository } from "buzzword-aws-text-repository-library";

import HTMLParsingProvider from "../../ports/HTMLParsingProvider";
import ScrapeURLDomain from "../ScrapeURLDomain";

const VALID_URL = new URL("https://www.example.com");
const VALID_HTML = "<html><body><p>Testing</p></body></html>";
const PARSED_CONTENT = "Testing";

const mockCrawlClient = mock<CrawlClient>();
const mockHTMLParser = mock<HTMLParsingProvider>();
const mockRepository = mock<TextRepository>();

const domain = new ScrapeURLDomain(
    mockCrawlClient,
    mockHTMLParser,
    mockRepository
);

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
    mockCrawlClient.getContent.mockReset();
    mockHTMLParser.parseHTML.mockReset();
    mockRepository.storePageText.mockReset();
});

test("obtains the HTML content for the page provided", async () => {
    await domain.scrapeURL(VALID_URL);

    expect(mockCrawlClient.getContent).toHaveBeenCalledTimes(1);
    expect(mockCrawlClient.getContent).toHaveBeenCalledWith(VALID_URL);
});

test("parses the HTML content returned", async () => {
    mockCrawlClient.getContent.mockResolvedValue(VALID_HTML);

    await domain.scrapeURL(VALID_URL);

    expect(mockHTMLParser.parseHTML).toHaveBeenCalledTimes(1);
    expect(mockHTMLParser.parseHTML).toHaveBeenCalledWith(VALID_HTML);
});

test("stores the parsed HTML content", async () => {
    mockCrawlClient.getContent.mockResolvedValue(VALID_HTML);
    mockHTMLParser.parseHTML.mockReturnValue(PARSED_CONTENT);

    await domain.scrapeURL(VALID_URL);

    expect(mockRepository.storePageText).toHaveBeenCalledTimes(1);
    expect(mockRepository.storePageText).toHaveBeenCalledWith(
        VALID_URL,
        PARSED_CONTENT
    );
});

test("returns success if the parsed content is stored successfully", async () => {
    mockCrawlClient.getContent.mockResolvedValue(VALID_HTML);
    mockHTMLParser.parseHTML.mockReturnValue(PARSED_CONTENT);
    mockRepository.storePageText.mockResolvedValue(true);

    const actual = await domain.scrapeURL(VALID_URL);

    expect(actual).toBe(true);
});

describe("retrieve content error handling", () => {
    test("returns failure if an error occurs retrieving content", async () => {
        mockCrawlClient.getContent.mockRejectedValue(new Error());

        const actual = await domain.scrapeURL(VALID_URL);

        expect(actual).toBe(false);
    });

    test("does not parse any HTML content if an error occurs retrieving content", async () => {
        mockCrawlClient.getContent.mockRejectedValue(new Error());

        await domain.scrapeURL(VALID_URL);

        expect(mockHTMLParser.parseHTML).not.toHaveBeenCalled();
    });

    test("does not store any content if an error occurs retrieving content", async () => {
        mockCrawlClient.getContent.mockRejectedValue(new Error());

        await domain.scrapeURL(VALID_URL);

        expect(mockRepository.storePageText).not.toHaveBeenCalled();
    });
});

describe("parsing content error handling", () => {
    test("returns failure if an error occurs parsing the page content", async () => {
        mockCrawlClient.getContent.mockResolvedValue(VALID_HTML);
        mockHTMLParser.parseHTML.mockImplementation(() => {
            throw new Error();
        });

        const actual = await domain.scrapeURL(VALID_URL);

        expect(actual).toBe(false);
    });

    test("does not store any content if an error occurs parsing the page content ", async () => {
        mockCrawlClient.getContent.mockResolvedValue(VALID_HTML);
        mockHTMLParser.parseHTML.mockImplementation(() => {
            throw new Error();
        });

        await domain.scrapeURL(VALID_URL);

        expect(mockRepository.storePageText).not.toHaveBeenCalled();
    });
});

describe("parsed content storage error handling", () => {
    test("returns failure if an error occurs storing the parsed page content", async () => {
        mockCrawlClient.getContent.mockResolvedValue(VALID_HTML);
        mockHTMLParser.parseHTML.mockReturnValue(PARSED_CONTENT);
        mockRepository.storePageText.mockRejectedValue(new Error());

        const actual = await domain.scrapeURL(VALID_URL);

        expect(actual).toBe(false);
    });

    test("returns failure if the parsed page content is not stored", async () => {
        mockCrawlClient.getContent.mockResolvedValue(VALID_HTML);
        mockHTMLParser.parseHTML.mockReturnValue(PARSED_CONTENT);
        mockRepository.storePageText.mockResolvedValue(false);

        const actual = await domain.scrapeURL(VALID_URL);

        expect(actual).toBe(false);
    });
});
