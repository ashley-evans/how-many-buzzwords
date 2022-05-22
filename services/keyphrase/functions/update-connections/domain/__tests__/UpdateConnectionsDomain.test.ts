import { mock } from "jest-mock-extended";
import {
    WebSocketClientFactory,
    WebSocketClient,
} from "buzzword-aws-web-socket-client-library";
import {
    ActiveConnectionsRepositoryPort,
    Connection,
} from "buzzword-aws-active-connections-repository-library";

import UpdateConnectionsDomain from "../UpdateConnectionsDomain";
import { BaseURLOccurrences } from "../../ports/UpdateConnectionsPort";
import { PathnameOccurrences } from "buzzword-aws-keyphrase-repository-library";

const mockClientFactory = mock<WebSocketClientFactory>();
const mockClient = mock<WebSocketClient>();
const mockRepository = mock<ActiveConnectionsRepositoryPort>();

const BASE_URL = "www.example.com";
const OTHER_BASE_URL = "www.other.com";
const CALLBACK_URL = new URL("https://www.example-callback.com/");
const OTHER_CALLBACK_URL = new URL("https://www.other-callback.com/");

function createOccurrences(
    baseURL: string,
    amount: number
): BaseURLOccurrences[] {
    const occurrences: BaseURLOccurrences[] = [];
    for (let i = 0; i < amount; i++) {
        occurrences.push({
            baseURL,
            pathname: `/path-${i}`,
            keyphrase: `keyphrase-${i}`,
            occurrences: i,
        });
    }

    return occurrences;
}

function createConnections(callbackURL: URL, amount: number): Connection[] {
    const connections: Connection[] = [];
    for (let i = 0; i < amount; i++) {
        connections.push({
            connectionID: `test_connection_id_${i}`,
            callbackURL,
        });
    }

    return connections;
}

function getUniqueBaseURLs(occurrences: BaseURLOccurrences[]): string[] {
    const baseURLs = occurrences.map((occurrence) => occurrence.baseURL);
    return [...new Set(baseURLs)];
}

function getUniqueCallbackURLs(connections: Connection[]): URL[] {
    const callbackURLs = connections.map(
        (connection) => connection.callbackURL
    );
    return [...new Set(callbackURLs)];
}

function getPathnameOccurrences(
    baseURL: string,
    occurrences: BaseURLOccurrences[]
): PathnameOccurrences[] {
    return occurrences
        .filter((occurrence) => occurrence.baseURL == baseURL)
        .map((filtered) => ({
            pathname: filtered.pathname,
            keyphrase: filtered.keyphrase,
            occurrences: filtered.occurrences,
        }));
}

describe.each([
    [
        "a single keyphrase occurrence count for a single base URL with no listening clients",
        createOccurrences(BASE_URL, 1),
    ],
    [
        "multiple keyphrase occurrences for a single base URL with no listening clients",
        createOccurrences(BASE_URL, 2),
    ],
    [
        "a single keyphrase occurrence for multiple base URLs with no listening clients",
        [
            ...createOccurrences(BASE_URL, 1),
            ...createOccurrences(OTHER_BASE_URL, 1),
        ],
    ],
    [
        "multiple keyphrase occurrences for multiple base URLs with no listening clients",
        [
            ...createOccurrences(BASE_URL, 2),
            ...createOccurrences(OTHER_BASE_URL, 2),
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
            mockRepository.getListeningConnections.mockResolvedValue([]);
            const domain = new UpdateConnectionsDomain(
                mockClientFactory,
                mockRepository
            );

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

describe.each([
    [
        "a single keyphrase occurrence for a single base URL with a single listening client",
        1,
        createConnections(CALLBACK_URL, 1),
    ],
    [
        "a single keyphrase occurrence for a single base URL with multiple listening clients",
        1,
        createConnections(CALLBACK_URL, 2),
    ],
    [
        "a single keyphrase occurrences for a single base URL with a single listening client",
        1,
        createConnections(CALLBACK_URL, 2),
    ],
    [
        "multiple keyphrase occurrences for a single base URL with multiple listening clients",
        2,
        createConnections(CALLBACK_URL, 2),
    ],
    [
        "multiple keyphrase occurrences for a single base URL with multiple listening clients with different callback URLs",
        2,
        [
            ...createConnections(CALLBACK_URL, 1),
            ...createConnections(OTHER_CALLBACK_URL, 1),
        ],
    ],
])(
    "given %s",
    (
        message: string,
        numberOfOccurrences: number,
        connections: Connection[]
    ) => {
        const occurrences = createOccurrences(BASE_URL, numberOfOccurrences);
        const uniqueCallbackURLs = getUniqueCallbackURLs(connections);

        let response: BaseURLOccurrences[];

        beforeAll(async () => {
            jest.resetAllMocks();
            mockClientFactory.createClient.mockReturnValue(mockClient);
            mockRepository.getListeningConnections.mockResolvedValue(
                connections
            );
            const domain = new UpdateConnectionsDomain(
                mockClientFactory,
                mockRepository
            );

            response = await domain.updateExistingConnections(occurrences);
        });

        test("calls the active connections repository for each unique base URL", () => {
            expect(
                mockRepository.getListeningConnections
            ).toHaveBeenCalledTimes(1);
            expect(mockRepository.getListeningConnections).toHaveBeenCalledWith(
                BASE_URL
            );
        });

        test("creates a client for each unique callback URL", () => {
            expect(mockClientFactory.createClient).toHaveBeenCalledTimes(
                uniqueCallbackURLs.length
            );
            for (const callbackURL of uniqueCallbackURLs) {
                expect(mockClientFactory.createClient).toHaveBeenCalledWith(
                    callbackURL
                );
            }
        });

        test("sends all keyphrase occurrences to each listening client", () => {
            const expectedOccurences: PathnameOccurrences[] =
                getPathnameOccurrences(BASE_URL, occurrences);

            expect(mockClient.sendData).toHaveBeenCalledTimes(
                connections.length
            );
            for (const connection of connections) {
                expect(mockClient.sendData).toHaveBeenCalledWith(
                    JSON.stringify(expectedOccurences),
                    connection.connectionID
                );
            }
        });

        test("returns no failures", () => {
            expect(response).toBeDefined();
            expect(response).toHaveLength(0);
        });
    }
);
