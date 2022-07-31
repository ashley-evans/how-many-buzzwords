import fs from "fs-extra";
import nock from "nock";
import path from "path";

import { mockURLFromFile } from "../../../../helpers/http-mock";
import CrawlHTTPClient from "../CrawlHTTPClient";

const CONTENT_ASSET = path.join(__dirname, "/assets/", "valid.html");

const VALID_SERVICE_URL = new URL("https://www.example.com/");
const VALID_CONTENT_URL = new URL("https://www.test.com/");

const EXPECTED_CONTENT_PATH = "/content";
const EXPECTED_CONTENT_URL_QUERY_STRING_PARAM = "url";

const client = new CrawlHTTPClient(VALID_SERVICE_URL);

beforeEach(() => {
    nock.cleanAll();
});

test("calls GET content on the crawl service with encoded url in query string", async () => {
    const urlMock = mockURLFromFile(
        VALID_SERVICE_URL,
        EXPECTED_CONTENT_PATH,
        CONTENT_ASSET,
        false,
        {
            [EXPECTED_CONTENT_URL_QUERY_STRING_PARAM]: encodeURIComponent(
                VALID_CONTENT_URL.toString()
            ),
        },
        { encodedQueryParams: true }
    );

    await client.getContent(VALID_CONTENT_URL);

    expect(urlMock.isDone()).toBe(true);
});

test("returns received HTML as string", async () => {
    const expectedContent = fs.readFileSync(CONTENT_ASSET).toString();
    mockURLFromFile(
        VALID_SERVICE_URL,
        EXPECTED_CONTENT_PATH,
        CONTENT_ASSET,
        false,
        {
            [EXPECTED_CONTENT_URL_QUERY_STRING_PARAM]: encodeURIComponent(
                VALID_CONTENT_URL.toString()
            ),
        },
        { encodedQueryParams: true }
    );

    const actual = await client.getContent(VALID_CONTENT_URL);

    expect(actual).toEqual(expectedContent);
});

test("throws an error if a error occurs while obtaining content", async () => {
    const expectedError = "test error";
    nock(VALID_SERVICE_URL.toString(), {
        encodedQueryParams: true,
    })
        .get(EXPECTED_CONTENT_PATH)
        .query({
            [EXPECTED_CONTENT_URL_QUERY_STRING_PARAM]: encodeURIComponent(
                VALID_CONTENT_URL.toString()
            ),
        })
        .replyWithError(expectedError);

    expect.assertions(1);
    await expect(() => client.getContent(VALID_CONTENT_URL)).rejects.toThrow(
        expectedError
    );
});

test("throws an error if a non-200 response is returned while obtaining content", async () => {
    const expectedError = "Request failed with status code 404";
    nock(VALID_SERVICE_URL.toString(), {
        encodedQueryParams: true,
    })
        .get(EXPECTED_CONTENT_PATH)
        .query({
            [EXPECTED_CONTENT_URL_QUERY_STRING_PARAM]: encodeURIComponent(
                VALID_CONTENT_URL.toString()
            ),
        })
        .reply(404);

    expect.assertions(1);
    await expect(() => client.getContent(VALID_CONTENT_URL)).rejects.toThrow(
        expectedError
    );
});
