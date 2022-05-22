import { mock } from "jest-mock-extended";
import {
    WebSocketClientFactory,
    WebSocketClient,
} from "buzzword-aws-web-socket-client-library";
import { ActiveConnectionsRepositoryPort } from "buzzword-aws-active-connections-repository-library";

import UpdateConnectionsDomain from "../UpdateConnectionsDomain";
import { BaseURLOccurrences } from "../../ports/UpdateConnectionsPort";

const mockClientFactory = mock<WebSocketClientFactory>();
const mockClient = mock<WebSocketClient>();
const mockRepository = mock<ActiveConnectionsRepositoryPort>();

const domain = new UpdateConnectionsDomain(mockClientFactory, mockRepository);

const BASE_URL = "www.example.com";
const OTHER_BASE_URL = "www.other.com";
const PATHNAME = "/example";
const OTHER_PATHNAME = "/other";
const KEYPHRASE = "test";
const OTHER_KEYPHRASE = "wibble";
const OCCURRENCES = 43;
const OTHER_OCCURRENCES = 13;

function createOccurrence(
    baseURL: string,
    pathname: string,
    keyphrase: string,
    occurrences: number
): BaseURLOccurrences {
    return {
        baseURL,
        pathname,
        keyphrase,
        occurrences,
    };
}

function getUniqueBaseURLs(occurrences: BaseURLOccurrences[]): string[] {
    const baseURLs = occurrences.map((occurrence) => occurrence.baseURL);
    return [...new Set(baseURLs)];
}

describe.each([
    [
        "a single keyphrase occurrence count for a single base URL and no listening clients",
        [createOccurrence(BASE_URL, PATHNAME, KEYPHRASE, OCCURRENCES)],
    ],
    [
        "multiple keyphrase occurrences for a single base URL with no listening clients",
        [
            createOccurrence(BASE_URL, PATHNAME, KEYPHRASE, OCCURRENCES),
            createOccurrence(
                BASE_URL,
                PATHNAME,
                OTHER_KEYPHRASE,
                OTHER_OCCURRENCES
            ),
        ],
    ],
    [
        "a single keyphrase occurrence for multiple base URLs and no listening clients",
        [
            createOccurrence(BASE_URL, PATHNAME, KEYPHRASE, OCCURRENCES),
            createOccurrence(
                OTHER_BASE_URL,
                OTHER_PATHNAME,
                OTHER_KEYPHRASE,
                OTHER_OCCURRENCES
            ),
        ],
    ],
    [
        "multiple keyphrase occurrences for multiple base URLs and no listening clients",
        [
            createOccurrence(BASE_URL, PATHNAME, KEYPHRASE, OCCURRENCES),
            createOccurrence(
                BASE_URL,
                OTHER_PATHNAME,
                OTHER_KEYPHRASE,
                OTHER_OCCURRENCES
            ),
            createOccurrence(
                OTHER_BASE_URL,
                OTHER_PATHNAME,
                OTHER_KEYPHRASE,
                OTHER_OCCURRENCES
            ),
            createOccurrence(
                OTHER_BASE_URL,
                PATHNAME,
                KEYPHRASE,
                OTHER_OCCURRENCES
            ),
        ],
    ],
])(
    "given %s with no listening clients",
    (message: string, occurrences: BaseURLOccurrences[]) => {
        const uniqueBaseURLs = getUniqueBaseURLs(occurrences);

        let response: BaseURLOccurrences[];

        beforeAll(async () => {
            jest.resetAllMocks();
            mockClientFactory.createClient.mockReturnValue(mockClient);

            response = await domain.updateExistingConnections(occurrences);
        });

        test("calls the active connections repository for each unique base URL", () => {
            expect(
                mockRepository.getListeningConnections
            ).toHaveBeenCalledTimes(uniqueBaseURLs.length);
            for (const baseURL of uniqueBaseURLs) {
                expect(
                    mockRepository.getListeningConnections
                ).toHaveBeenCalledWith(baseURL);
            }
        });

        test("does not create a web socket client", () => {
            expect(mockClientFactory.createClient).not.toHaveBeenCalled();
        });

        test("does not call any existing web socket client to send the new occurrences", () => {
            expect(mockClient.sendData).not.toHaveBeenCalled();
        });

        test("returns no failures", () => {
            expect(response).toBeDefined();
            expect(response).toHaveLength(0);
        });
    }
);
