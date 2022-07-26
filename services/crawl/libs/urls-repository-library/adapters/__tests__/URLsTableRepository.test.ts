/**
 * @group integration
 */

process.env.AWS_ACCESS_KEY_ID = "x";
process.env.AWS_SECRET_ACCESS_KEY = "x";
process.env.AWS_REGION = "eu-west-2";

import dynamoose from "dynamoose";
import CrawlStatus from "../../enums/CrawlStatus";

import { Pathname } from "../../ports/Repository";
import URLsTableRepository from "../URLsTableRepository";

dynamoose.aws.ddb.local("http://localhost:8000");

const VALID_HOSTNAME = "www.example.com";
const OTHER_HOSTNAME = "www.test.com";
const VALID_PATHNAME = "/example";
const OTHER_PATHNAME = "/test";
const TABLE_NAME = "urls-table";

const repository = new URLsTableRepository(TABLE_NAME, true);

function createPaths(total: number) {
    const paths: string[] = [];
    for (let i = 0; i < total; i++) {
        paths.push(`/random-${i}`);
    }

    return paths;
}

beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

test.each([
    ["one stored", createPaths(1)],
    ["multiple stored", createPaths(2)],
])(
    "returns pathnames given %s",
    async (message: string, pathnames: string[]) => {
        for (const pathname of pathnames) {
            await repository.storePathname(VALID_HOSTNAME, pathname);
        }

        const response = await repository.getPathnames(VALID_HOSTNAME);
        await repository.deletePathnames(VALID_HOSTNAME);

        expect(response).toBeDefined();
        expect(response).toHaveLength(pathnames.length);
        for (const pathname of pathnames) {
            expect(response).toContainEqual(
                expect.objectContaining({
                    pathname,
                })
            );
        }
    }
);

test("only returns pathnames attributed to given base URL", async () => {
    await repository.storePathname(VALID_HOSTNAME, VALID_PATHNAME);
    await repository.storePathname(OTHER_HOSTNAME, OTHER_PATHNAME);

    const response = await repository.getPathnames(VALID_HOSTNAME);
    await repository.deletePathnames(VALID_HOSTNAME);
    await repository.deletePathnames(OTHER_HOSTNAME);

    expect(response).toBeDefined();
    expect(response).toHaveLength(1);
    expect(response[0].pathname).toEqual(VALID_PATHNAME);
});

describe("given pathname stored when requested specifically", () => {
    let response: Pathname | undefined;

    beforeAll(async () => {
        await repository.storePathname(VALID_HOSTNAME, VALID_PATHNAME);

        response = await repository.getPathname(VALID_HOSTNAME, VALID_PATHNAME);
    });

    test("returns specified pathname", () => {
        expect(response?.pathname).toEqual(VALID_PATHNAME);
    });

    test("returns created time for pathname", () => {
        expect(response?.createdAt).toEqual(expect.any(Date));
    });

    test("returns updated time for pathname", () => {
        expect(response?.updatedAt).toEqual(expect.any(Date));
    });

    afterAll(async () => {
        await repository.deletePathnames(VALID_HOSTNAME);
    });
});

test("returns undefined given unknown pathname", async () => {
    const response = await repository.getPathname(
        VALID_HOSTNAME,
        VALID_PATHNAME
    );

    expect(response).toBeUndefined();
});

describe("stores new pathname", () => {
    let response: boolean;
    let stored: Pathname[];

    beforeAll(async () => {
        response = await repository.storePathname(
            VALID_HOSTNAME,
            VALID_PATHNAME
        );

        stored = await repository.getPathnames(VALID_HOSTNAME);
    });

    test("stores the provided pathname into table", () => {
        expect(stored).toBeDefined();
        expect(stored).toHaveLength(1);
        expect(stored[0].pathname).toEqual(VALID_PATHNAME);
    });

    test("stores the time created", () => {
        expect(stored).toBeDefined();
        expect(stored).toHaveLength(1);
        expect(stored[0].createdAt).toEqual(expect.any(Date));
    });

    test("stores the time updated (equal to created)", () => {
        expect(stored).toBeDefined();
        expect(stored).toHaveLength(1);
        expect(stored[0].updatedAt).toEqual(expect.any(Date));
        expect(stored[0].createdAt).toEqual(stored[0].updatedAt);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deletePathnames(VALID_HOSTNAME);
    });
});

describe("overwrites existing pathname", () => {
    let response: boolean;
    let original: Pathname[];
    let updated: Pathname[];

    beforeAll(async () => {
        await repository.storePathname(VALID_HOSTNAME, VALID_PATHNAME);
        original = await repository.getPathnames(VALID_HOSTNAME);

        response = await repository.storePathname(
            VALID_HOSTNAME,
            VALID_PATHNAME
        );
        updated = await repository.getPathnames(VALID_HOSTNAME);
    });

    test("does not add duplicate pathnames", () => {
        expect(updated).toHaveLength(1);
        expect(updated[0].pathname).toEqual(VALID_PATHNAME);
    });

    test("returns a different created date to previous", () => {
        expect(updated[0].createdAt).toEqual(expect.any(Date));
        expect(updated[0].createdAt).not.toEqual(original[0].createdAt);
    });

    test("returns the different updated date to previous", () => {
        expect(updated[0].updatedAt).toEqual(expect.any(Date));
        expect(updated[0].updatedAt).not.toEqual(original[0].updatedAt);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deletePathnames(VALID_HOSTNAME);
    });
});

describe.each([
    ["a single pathname stored", createPaths(1)],
    ["less than 25 pathnames stored", createPaths(24)],
    ["more than 26 pathnames stored", createPaths(26)],
])("deletes given %s", (message: string, pathnames: string[]) => {
    let response: boolean;

    beforeAll(async () => {
        for (const pathname of pathnames) {
            await repository.storePathname(VALID_HOSTNAME, pathname);
        }

        response = await repository.deletePathnames(VALID_HOSTNAME);
    });

    test("returns no pathnames", async () => {
        const result = await repository.getPathnames(VALID_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(0);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });
});

describe("only deletes pathnames attributed to given base URL", () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storePathname(VALID_HOSTNAME, VALID_PATHNAME);
        await repository.storePathname(OTHER_HOSTNAME, OTHER_PATHNAME);

        response = await repository.deletePathnames(VALID_HOSTNAME);
    });

    test("returns no pathnames for deleted base URL", async () => {
        const result = await repository.getPathnames(VALID_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(0);
    });

    test("returns existing pathnames for other base URL", async () => {
        const result = await repository.getPathnames(OTHER_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0].pathname).toEqual(OTHER_PATHNAME);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deletePathnames(OTHER_HOSTNAME);
    });
});

test("returns success if no pathnames exist upon deletion", async () => {
    const response = await repository.deletePathnames("invalid");

    expect(response).toEqual(true);
});

test("given no pathnames then empty array returned upon GET", async () => {
    const response = await repository.getPathnames("invalid");

    expect(response).toBeDefined();
    expect(response).toHaveLength(0);
});

describe("Crawl Status operations", () => {
    test("returns success if no crawl status is stored for a base URL upon deletion", async () => {
        const response = await repository.deleteCrawlStatus(VALID_HOSTNAME);

        expect(response).toEqual(true);
    });

    test("returns success when deleting an existing crawl status", async () => {
        await repository.updateCrawlStatus(VALID_HOSTNAME, CrawlStatus.STARTED);

        const response = await repository.deleteCrawlStatus(VALID_HOSTNAME);

        expect(response).toBe(true);
    });

    test("succesfully deletes an existing crawl status", async () => {
        await repository.updateCrawlStatus(VALID_HOSTNAME, CrawlStatus.STARTED);
        await repository.deleteCrawlStatus(VALID_HOSTNAME);

        const actual = await repository.getCrawlStatus(VALID_HOSTNAME);

        expect(actual).toBeUndefined();
    });

    test("returns undefined if no crawl status is stored for a base URL", async () => {
        await repository.deleteCrawlStatus(VALID_HOSTNAME);

        const response = await repository.getCrawlStatus(VALID_HOSTNAME);

        expect(response).toBeUndefined();
    });

    test("returns success if crawl status update succeeds", async () => {
        const response = await repository.updateCrawlStatus(
            VALID_HOSTNAME,
            CrawlStatus.COMPLETE
        );

        expect(response).toEqual(true);
    });

    test("returns success when overwriting an existing crawl status", async () => {
        await repository.updateCrawlStatus(VALID_HOSTNAME, CrawlStatus.STARTED);

        const response = await repository.updateCrawlStatus(
            VALID_HOSTNAME,
            CrawlStatus.COMPLETE
        );

        expect(response).toEqual(true);
    });

    test("overwrites an existing crawl status with a new value", async () => {
        await repository.updateCrawlStatus(VALID_HOSTNAME, CrawlStatus.STARTED);
        await repository.updateCrawlStatus(
            VALID_HOSTNAME,
            CrawlStatus.COMPLETE
        );

        const actual = await repository.getCrawlStatus(VALID_HOSTNAME);

        expect(actual).toEqual(CrawlStatus.COMPLETE);
    });

    test.each(Object.values(CrawlStatus))(
        "returns status if crawl status is stored for a base URL given status is %s",
        async (expectedStatus) => {
            await repository.updateCrawlStatus(VALID_HOSTNAME, expectedStatus);

            const actual = await repository.getCrawlStatus(VALID_HOSTNAME);

            expect(actual).toEqual(expectedStatus);
        }
    );
});
