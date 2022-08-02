import { mock } from "jest-mock-extended";
import { CrawlClient } from "@ashley-evans/buzzword-crawl-client";
import { TextRepository } from "buzzword-aws-text-repository-library";

import HTMLParsingProvider from "../../ports/HTMLParsingProvider";
import ScrapeURLDomain from "../ScrapeURLDomain";

const VALID_URL = new URL("https://www.example.com");

const mockCrawlClient = mock<CrawlClient>();
const mockHTMLParser = mock<HTMLParsingProvider>();
const mockRepository = mock<TextRepository>();

const domain = new ScrapeURLDomain(
    mockCrawlClient,
    mockHTMLParser,
    mockRepository
);

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
