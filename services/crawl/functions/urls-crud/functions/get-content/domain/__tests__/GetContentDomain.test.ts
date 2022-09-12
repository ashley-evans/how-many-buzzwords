import { mock } from "jest-mock-extended";
import { ContentRepository } from "buzzword-crawl-content-repository-library";

import GetContentDomain from "../GetContentDomain";

const VALID_URL = new URL("https://www.example.com/");
const EXPECTED_RESPONSE = "test";

const mockContentRepository = mock<ContentRepository>();
const domain = new GetContentDomain(mockContentRepository);

describe("given content stored", () => {
    let response: string;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockContentRepository.getPageContent.mockResolvedValue(
            EXPECTED_RESPONSE
        );

        response = await domain.getPageContent(VALID_URL);
    });

    test("calls content repository with provided URL", () => {
        expect(mockContentRepository.getPageContent).toBeCalledTimes(1);
        expect(mockContentRepository.getPageContent).toHaveBeenCalledWith(
            VALID_URL
        );
    });

    test("returns content returned by content repository", () => {
        expect(response).toEqual(EXPECTED_RESPONSE);
    });
});

test("throws error given content repository throws an error", async () => {
    jest.resetAllMocks();

    const expectedError = new Error("test error");
    mockContentRepository.getPageContent.mockRejectedValue(expectedError);

    expect.assertions(1);
    await expect(domain.getPageContent(VALID_URL)).rejects.toEqual(
        expectedError
    );
});
