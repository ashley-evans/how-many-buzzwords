/**
 * @jest-environment node
 */

import nock from "nock";

import CrawlServiceAxiosClient from "../CrawlServiceAxiosClient";

const CRAWL_SERVICE_ENDPOINT = new URL("https://www.example.com/");
const EXPECTED_CRAWL_PATHNAME = "/crawl";
const BASE_URL = new URL("https://www.test.com/");

const client = new CrawlServiceAxiosClient(CRAWL_SERVICE_ENDPOINT);

function createCrawlPathMock(): nock.Scope {
    const expectedHeaders = {
        "Content-Type": "application/json",
    };
    return nock(CRAWL_SERVICE_ENDPOINT.toString(), {
        reqheaders: expectedHeaders,
    })
        .post(EXPECTED_CRAWL_PATHNAME, {
            MessageBody: { url: BASE_URL.toString() },
        })
        .reply(200);
}

beforeEach(() => {
    nock.cleanAll();
});

test("returns 200 if request was successful", async () => {
    createCrawlPathMock();

    const result = await client.crawl(BASE_URL);

    expect(result).toEqual(true);
});

test("calls the crawl path with the provided URL when given a URL to crawl", async () => {
    const scope = createCrawlPathMock();

    await client.crawl(BASE_URL);

    expect(scope.isDone()).toEqual(true);
});
