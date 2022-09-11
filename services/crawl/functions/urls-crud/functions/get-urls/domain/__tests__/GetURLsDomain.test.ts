import { mock } from "jest-mock-extended";
import {
    Pathname,
    Repository,
} from "buzzword-aws-crawl-service-urls-repository-library";

import GetURLsDomain from "../GetURLsDomain";
import { PathnameResponse } from "../../ports/GetURLsPort";

const VALID_URL = new URL("https://www.example.com/");

const mockRepository = mock<Repository>();
const domain = new GetURLsDomain(mockRepository);

function createPathnameEntry(pathname: string): Pathname {
    const date = new Date();
    return {
        pathname,
        createdAt: date,
        updatedAt: date,
    };
}

describe("given a URL that has been crawled before", () => {
    const pathnames = [
        createPathnameEntry(VALID_URL.pathname),
        createPathnameEntry("/test"),
    ];

    let response: PathnameResponse[];

    beforeAll(async () => {
        jest.resetAllMocks();
        mockRepository.getPathnames.mockResolvedValue(pathnames);

        response = await domain.getPathnames(VALID_URL);
    });

    test("calls repository with hostname from provided URL", () => {
        expect(mockRepository.getPathnames).toHaveBeenCalledTimes(1);
        expect(mockRepository.getPathnames).toHaveBeenCalledWith(
            VALID_URL.hostname
        );
    });

    test("returns all pathnames crawled", () => {
        for (const pathname of pathnames) {
            expect(response).toContainEqual(
                expect.objectContaining({
                    pathname: pathname.pathname,
                })
            );
        }
    });

    test("returns the created time of the pathname as the crawl time", () => {
        for (const pathname of pathnames) {
            expect(response).toContainEqual(
                expect.objectContaining({
                    crawledAt: pathname.createdAt,
                })
            );
        }
    });
});

describe("given a URL that has not been crawled before", () => {
    let response: PathnameResponse[];

    beforeAll(async () => {
        jest.resetAllMocks();
        mockRepository.getPathnames.mockResolvedValue([]);

        response = await domain.getPathnames(VALID_URL);
    });

    test("calls repository with hostname from provided URL", () => {
        expect(mockRepository.getPathnames).toHaveBeenCalledTimes(1);
        expect(mockRepository.getPathnames).toHaveBeenCalledWith(
            VALID_URL.hostname
        );
    });

    test("returns an empty array", () => {
        expect(response).toHaveLength(0);
    });
});

test("returns repository error if thrown", async () => {
    jest.resetAllMocks();

    const expectedError = new Error("test error");
    mockRepository.getPathnames.mockRejectedValue(expectedError);

    expect.assertions(1);
    await expect(domain.getPathnames(VALID_URL)).rejects.toEqual(expectedError);
});
