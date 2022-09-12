import { mock } from "jest-mock-extended";
import { createMock } from "ts-auto-mock";
import { On, method } from "ts-auto-mock/extension";
import { when } from "jest-when";
import {
    WebSocketClientFactory,
    WebSocketClient,
} from "buzzword-keyphrase-web-socket-client-library";
import {
    ActiveConnectionsRepositoryPort,
    Connection,
} from "buzzword-keyphrase-active-connections-repository-library";

import UpdateConnectionsDomain from "../UpdateConnectionsDomain";
import { BaseURLOccurrences } from "../../ports/UpdateConnectionsPort";
import { PathnameOccurrences } from "buzzword-keyphrase-keyphrase-repository-library";

const mockClientFactory = mock<WebSocketClientFactory>();
const mockClient = createMock<WebSocketClient>();
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
            connectionID: `${callbackURL.toString()}_connection_id_${i}`,
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

        test("calls the active connections repository to get listening clients", () => {
            expect(
                mockRepository.getListeningConnections
            ).toHaveBeenCalledTimes(1);
            expect(mockRepository.getListeningConnections).toHaveBeenCalledWith(
                BASE_URL
            );
        });

        test("creates a client for each unique callback URL", () => {
            const uniqueCallbackURLs = getUniqueCallbackURLs(connections);

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

describe("given multiple new keyphrase occurrences for multiple base URLs with different listening clients", () => {
    const connections = new Map([
        [BASE_URL, createConnections(CALLBACK_URL, 1)],
        [OTHER_BASE_URL, createConnections(OTHER_CALLBACK_URL, 1)],
    ]);
    const occurrences = [
        ...createOccurrences(BASE_URL, 2),
        ...createOccurrences(OTHER_BASE_URL, 2),
    ];

    let response: BaseURLOccurrences[];

    beforeAll(async () => {
        jest.resetAllMocks();
        mockClientFactory.createClient.mockReturnValue(mockClient);
        for (const [baseURL, listeningConnections] of connections) {
            when(mockRepository.getListeningConnections)
                .calledWith(baseURL)
                .mockResolvedValue(listeningConnections);
        }
        const domain = new UpdateConnectionsDomain(
            mockClientFactory,
            mockRepository
        );

        response = await domain.updateExistingConnections(occurrences);
    });

    test("calls the active connections repository for each unique base URL", () => {
        const uniqueBaseURLs = getUniqueBaseURLs(occurrences);

        expect(mockRepository.getListeningConnections).toHaveBeenCalledTimes(
            uniqueBaseURLs.length
        );
        for (const baseURL of uniqueBaseURLs) {
            expect(mockRepository.getListeningConnections).toHaveBeenCalledWith(
                baseURL
            );
        }
    });

    test("creates a client for each unique callback URL", () => {
        const uniqueCallbackURLs: URL[] = [];
        for (const [, listeningConnections] of connections) {
            uniqueCallbackURLs.push(
                ...getUniqueCallbackURLs(listeningConnections)
            );
        }

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
        let totalConnections = 0;
        for (const [baseURL, listeningConnections] of connections) {
            totalConnections += listeningConnections.length;
            const expectedOccurences: PathnameOccurrences[] =
                getPathnameOccurrences(baseURL, occurrences);

            for (const connection of listeningConnections) {
                expect(mockClient.sendData).toHaveBeenCalledWith(
                    JSON.stringify(expectedOccurences),
                    connection.connectionID
                );
            }
        }

        expect(mockClient.sendData).toHaveBeenCalledTimes(totalConnections);
    });

    test("returns no failures", () => {
        expect(response).toBeDefined();
        expect(response).toHaveLength(0);
    });
});

describe.each([
    ["occurrences against a single base URL", [BASE_URL]],
    ["occurrences for multiple base URLs", [BASE_URL, OTHER_BASE_URL]],
])(
    "given an error occurs creating obtaining the listening connections for %s",
    (message: string, occurrencesBaseURLs: string[]) => {
        const occurrences = occurrencesBaseURLs
            .map((occurrencesBaseURL) =>
                createOccurrences(occurrencesBaseURL, 2)
            )
            .flat();

        let response: BaseURLOccurrences[];

        beforeAll(async () => {
            jest.resetAllMocks();
            jest.spyOn(console, "error").mockImplementation(() => undefined);
            mockRepository.getListeningConnections.mockRejectedValue(
                new Error()
            );
            const domain = new UpdateConnectionsDomain(
                mockClientFactory,
                mockRepository
            );

            response = await domain.updateExistingConnections(occurrences);
        });

        test("calls the repository to obtain the keyphrase state for each unique base URL", () => {
            expect(
                mockRepository.getListeningConnections
            ).toHaveBeenCalledTimes(occurrencesBaseURLs.length);
            for (const occurrenceBaseURL of occurrencesBaseURLs) {
                expect(
                    mockRepository.getListeningConnections
                ).toHaveBeenCalledWith(occurrenceBaseURL);
            }
        });

        test("does not create any clients to send the new occurrences to", () => {
            expect(mockClientFactory.createClient).not.toHaveBeenCalled();
        });

        test("does not call any existing client", () => {
            expect(mockClient.sendData).not.toHaveBeenCalled();
        });

        test("returns each occurrence as a failure", () => {
            expect(response).toEqual(expect.arrayContaining(occurrences));
        });
    }
);

describe("given an error only occurs while obtaining the listening connections for one of the base URLs provided", () => {
    const expectedSuccesses = createOccurrences(BASE_URL, 2);
    const expectedFailures = createOccurrences(OTHER_BASE_URL, 2);
    const expectedConnections = createConnections(CALLBACK_URL, 2);

    let response: BaseURLOccurrences[];

    beforeAll(async () => {
        jest.resetAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        when(mockRepository.getListeningConnections)
            .calledWith(BASE_URL)
            .mockResolvedValue(expectedConnections);
        when(mockRepository.getListeningConnections)
            .calledWith(OTHER_BASE_URL)
            .mockRejectedValue(new Error());
        mockClientFactory.createClient.mockReturnValue(mockClient);
        const domain = new UpdateConnectionsDomain(
            mockClientFactory,
            mockRepository
        );

        response = await domain.updateExistingConnections([
            ...expectedSuccesses,
            ...expectedFailures,
        ]);
    });

    test("calls the repository to obtain the keyphrase state for each unique base URL", () => {
        expect(mockRepository.getListeningConnections).toHaveBeenCalledTimes(2);
        expect(mockRepository.getListeningConnections).toHaveBeenCalledWith(
            BASE_URL
        );
        expect(mockRepository.getListeningConnections).toHaveBeenCalledWith(
            OTHER_BASE_URL
        );
    });

    test("only creates a client for unique callback URLs attributed listening to non-erroring base URLs", () => {
        expect(mockClientFactory.createClient).toHaveBeenCalledTimes(1);
        expect(mockClientFactory.createClient).toHaveBeenCalledWith(
            CALLBACK_URL
        );
    });

    test("sends all keyphrase occurrences to clients that are listening to non-erroring base URLs", () => {
        const expectedOccurences: PathnameOccurrences[] =
            getPathnameOccurrences(BASE_URL, expectedSuccesses);

        expect(mockClient.sendData).toHaveBeenCalledTimes(
            expectedConnections.length
        );
        for (const connection of expectedConnections) {
            expect(mockClient.sendData).toHaveBeenCalledWith(
                JSON.stringify(expectedOccurences),
                connection.connectionID
            );
        }
    });

    test("returns only occurrences related to error", () => {
        expect(response).toEqual(expect.arrayContaining(expectedFailures));
    });
});

test("returns all occurrences as failures if an error occurs sending data to a listening client given a single base URL", async () => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const expectedOccurences = createOccurrences(BASE_URL, 2);
    const connections = createConnections(CALLBACK_URL, 2);
    mockClientFactory.createClient.mockReturnValue(mockClient);
    mockRepository.getListeningConnections.mockResolvedValue(connections);
    const mockSendData: jest.Mock = On(mockClient).get(
        method((mock) => mock.sendData)
    );
    mockSendData.mockRejectedValue(new Error());
    const domain = new UpdateConnectionsDomain(
        mockClientFactory,
        mockRepository
    );

    const response = await domain.updateExistingConnections(expectedOccurences);

    expect(response).toEqual(expect.arrayContaining(expectedOccurences));
});

test("only returns occurrences related to the base URL as failures if an error occurs during sending of data to a listening client", async () => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const failureOccurrences = createOccurrences(BASE_URL, 2);
    const successOccurrences = createOccurrences(OTHER_BASE_URL, 2);
    const connections = createConnections(CALLBACK_URL, 1);
    mockClientFactory.createClient.mockReturnValue(mockClient);
    mockRepository.getListeningConnections.mockResolvedValue(connections);
    const mockSendData: jest.Mock = On(mockClient).get(
        method((mock) => mock.sendData)
    );
    when(mockSendData)
        .calledWith(
            JSON.stringify(
                getPathnameOccurrences(BASE_URL, failureOccurrences)
            ),
            expect.anything()
        )
        .mockRejectedValue(new Error());
    const domain = new UpdateConnectionsDomain(
        mockClientFactory,
        mockRepository
    );

    const response = await domain.updateExistingConnections([
        ...failureOccurrences,
        ...successOccurrences,
    ]);

    expect(response).toEqual(expect.arrayContaining(failureOccurrences));
});

test("returns all occurrences as failures if an error occurs creating a client given a single base URL", async () => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const expectedOccurences = createOccurrences(BASE_URL, 2);
    const connections = createConnections(CALLBACK_URL, 2);
    mockClientFactory.createClient.mockImplementation(() => {
        throw new Error();
    });
    mockRepository.getListeningConnections.mockResolvedValue(connections);
    const domain = new UpdateConnectionsDomain(
        mockClientFactory,
        mockRepository
    );

    const response = await domain.updateExistingConnections(expectedOccurences);

    expect(response).toEqual(expect.arrayContaining(expectedOccurences));
});

test("only returns occurrences related to the base URL as failures if an error occurs creating a client", async () => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const failureOccurrences = createOccurrences(BASE_URL, 2);
    const successOccurrences = createOccurrences(OTHER_BASE_URL, 2);
    const failureConnections = createConnections(CALLBACK_URL, 1);
    const successConnections = createConnections(OTHER_CALLBACK_URL, 1);
    when(mockRepository.getListeningConnections)
        .calledWith(BASE_URL)
        .mockResolvedValue(failureConnections);
    when(mockRepository.getListeningConnections)
        .calledWith(OTHER_BASE_URL)
        .mockResolvedValue(successConnections);
    when(mockClientFactory.createClient)
        .calledWith(CALLBACK_URL)
        .mockImplementation(() => {
            throw new Error();
        });
    when(mockClientFactory.createClient)
        .calledWith(OTHER_CALLBACK_URL)
        .mockReturnValue(mockClient);
    const domain = new UpdateConnectionsDomain(
        mockClientFactory,
        mockRepository
    );

    const response = await domain.updateExistingConnections([
        ...failureOccurrences,
        ...successOccurrences,
    ]);

    expect(response).toEqual(expect.arrayContaining(failureOccurrences));
});
