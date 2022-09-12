import { mock } from "jest-mock-extended";

jest.mock("buzzword-crawl-urls-repository-library");

import { handler } from "../recent-crawl";
import { RecentCrawlEvent } from "../ports/RecentCrawlAdapter";

const mockEvent = mock<RecentCrawlEvent>();

const VALID_MAX_CRAWL_AGE_HOURS = "1";
const VALID_TABLE_NAME = "test";

beforeEach(() => {
    process.env.MAX_CRAWL_AGE_HOURS = VALID_MAX_CRAWL_AGE_HOURS;
    process.env.TABLE_NAME = VALID_TABLE_NAME;
});

test.each([
    ["undefined", undefined],
    ["not a number", "wibble"],
    ["zero", 0],
    ["negative", -1],
])(
    "throws error if max crawl age in hours is %s",
    async (message: string, value?: string | number) => {
        if (value) {
            process.env.MAX_CRAWL_AGE_HOURS = value.toString();
        } else {
            delete process.env.MAX_CRAWL_AGE_HOURS;
        }

        await expect(handler(mockEvent)).rejects.toThrow(
            new Error("Max crawl age configuration is invalid.")
        );
    }
);

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    await expect(handler(mockEvent)).rejects.toThrow(
        new Error("URLs Table Name has not been set.")
    );
});
