import { mock } from "jest-mock-extended";
import { createMock } from "ts-auto-mock";
import { On, method } from "ts-auto-mock/extension";
import {
    PathnameOccurrences,
    Repository,
} from "buzzword-aws-keyphrase-repository-library";
import {
    WebSocketClient,
    WebSocketClientFactory,
} from "buzzword-aws-web-socket-client-library";

import NewConnectionDomain from "../NewConnectionDomain";
import { Connection } from "../../ports/NewConnectionPort";

const mockRepository = mock<Repository>();
const mockClient = createMock<WebSocketClient>();
const mockClientFactory = mock<WebSocketClientFactory>();

const CONNECTION_ID = "test_connection_id";
const CALLBACK_URL = new URL("https://www.callback.com/");
const OTHER_CALLBACK_URL = new URL("https://www.anothercallback.com/");
const BASE_URL = "www.example.com";
const OTHER_BASE_URL = "www.anotherexample.com";

function createConnection(
    connectionID: string,
    callbackURL: URL,
    baseURL: string
): Connection {
    return {
        connectionID,
        callbackURL,
        baseURL,
    };
}

function createOccurrences(
    baseURL: string,
    amount: number
): PathnameOccurrences[] {
    const occurrences: PathnameOccurrences[] = [];
    for (let i = 0; i < amount; i++) {
        occurrences.push({
            pathname: `${baseURL}-pathname-${i}`,
            keyphrase: `${baseURL}-keyphrase-${i}`,
            occurrences: i + 1,
        });
    }

    return occurrences;
}

describe("given a single new connection listening to a base URL", () => {
    const connection = createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL);

    describe("given no keyphrases stored against base URL", () => {
        let response: boolean;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockClientFactory.createClient.mockReturnValue(mockClient);
            mockRepository.getKeyphrases.mockResolvedValue([]);

            const domain = new NewConnectionDomain(
                mockClientFactory,
                mockRepository
            );
            response = await domain.provideCurrentKeyphrases(connection);
        });

        test("calls repository to obtain current keyphrase state for base URL", () => {
            expect(mockRepository.getKeyphrases).toHaveBeenCalledTimes(1);
            expect(mockRepository.getKeyphrases).toHaveBeenCalledWith(
                connection.baseURL
            );
        });

        test("does not create a client to handle the connections", () => {
            expect(mockClientFactory.createClient).not.toHaveBeenCalled();
        });

        test("does not call any existing client references", () => {
            expect(mockClient.sendData).not.toHaveBeenCalled();
        });

        test("returns success", () => {
            expect(response).toEqual(true);
        });
    });

    describe.each([
        [
            "a single keyphrase occurrence stored",
            createOccurrences(BASE_URL, 1),
        ],
        [
            "multiple keyphrase occurrences stored",
            createOccurrences(BASE_URL, 3),
        ],
    ])(
        "given the base URL has %s",
        (message: string, expectedOccurrences: PathnameOccurrences[]) => {
            let response: boolean;

            beforeAll(async () => {
                jest.resetAllMocks();
                const mockSendData: jest.Mock = On(mockClient).get(
                    method((mock) => mock.sendData)
                );
                mockSendData.mockResolvedValue(true);
                mockClientFactory.createClient.mockReturnValue(mockClient);
                mockRepository.getKeyphrases.mockResolvedValue(
                    expectedOccurrences
                );
                const domain = new NewConnectionDomain(
                    mockClientFactory,
                    mockRepository
                );

                response = await domain.provideCurrentKeyphrases(connection);
            });

            test("calls repository to obtain current keyphrase state for base URL", () => {
                expect(mockRepository.getKeyphrases).toHaveBeenCalledTimes(1);
                expect(mockRepository.getKeyphrases).toHaveBeenCalledWith(
                    connection.baseURL
                );
            });

            test("calls the web socket client factory to create a client", () => {
                expect(mockClientFactory.createClient).toHaveBeenCalledTimes(1);
                expect(mockClientFactory.createClient).toHaveBeenCalledWith(
                    connection.callbackURL
                );
            });

            test("calls web socket client with returned keyphrase occurrences", () => {
                expect(mockClient.sendData).toHaveBeenCalledTimes(1);
                expect(mockClient.sendData).toHaveBeenCalledWith(
                    JSON.stringify(expectedOccurrences),
                    connection.connectionID
                );
            });

            test("returns success", () => {
                expect(response).toEqual(true);
            });
        }
    );

    describe("given an error occurs while obtaining the keyphrase occurrences", () => {
        let response: boolean;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockClientFactory.createClient.mockReturnValue(mockClient);
            mockRepository.getKeyphrases.mockRejectedValue(new Error());
            const domain = new NewConnectionDomain(
                mockClientFactory,
                mockRepository
            );

            response = await domain.provideCurrentKeyphrases(connection);
        });

        test("does not create a client to handle the connections", () => {
            expect(mockClientFactory.createClient).not.toHaveBeenCalled();
        });

        test("does not call any existing client references", () => {
            expect(mockClient.sendData).not.toHaveBeenCalled();
        });

        test("returns failure", () => {
            expect(response).toEqual(false);
        });
    });

    describe("given an error occurs during the creation of a web socket client", () => {
        let response: boolean;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockClientFactory.createClient.mockImplementation(() => {
                throw new Error();
            });
            mockRepository.getKeyphrases.mockResolvedValue(
                createOccurrences(BASE_URL, 1)
            );

            const domain = new NewConnectionDomain(
                mockClientFactory,
                mockRepository
            );
            response = await domain.provideCurrentKeyphrases(connection);
        });

        test("does not call any existing client references", () => {
            expect(mockClient.sendData).not.toHaveBeenCalled();
        });

        test("returns failure", () => {
            expect(response).toEqual(false);
        });
    });

    test("returns failure if error occurs during the transmission of keyphrases state", async () => {
        jest.resetAllMocks();
        mockRepository.getKeyphrases.mockResolvedValue(
            createOccurrences(BASE_URL, 1)
        );
        mockClientFactory.createClient.mockReturnValue(mockClient);
        const mockSendData: jest.Mock = On(mockClient).get(
            method((mock) => mock.sendData)
        );
        mockSendData.mockRejectedValue(new Error());
        const domain = new NewConnectionDomain(
            mockClientFactory,
            mockRepository
        );

        const response = await domain.provideCurrentKeyphrases(connection);

        expect(response).toEqual(false);
    });

    test("returns failure if the client fails to send keyphrase state", async () => {
        jest.resetAllMocks();
        mockRepository.getKeyphrases.mockResolvedValue(
            createOccurrences(BASE_URL, 1)
        );
        mockClientFactory.createClient.mockReturnValue(mockClient);
        const mockSendData: jest.Mock = On(mockClient).get(
            method((mock) => mock.sendData)
        );
        mockSendData.mockResolvedValue(false);
        const domain = new NewConnectionDomain(
            mockClientFactory,
            mockRepository
        );

        const response = await domain.provideCurrentKeyphrases(connection);

        expect(response).toEqual(false);
    });
});

describe.each([
    [
        "the same callback address listening to the same base URL",
        [
            createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL),
            createConnection("test_connection_id_2", CALLBACK_URL, BASE_URL),
        ],
    ],
    [
        "the same callback address listening to multiple base URLs",
        [
            createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL),
            createConnection(
                "test_connection_id_2",
                CALLBACK_URL,
                OTHER_BASE_URL
            ),
        ],
    ],
    [
        "multiple callback addresses listening to the same base URL",
        [
            createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL),
            createConnection(
                "test_connection_id_2",
                OTHER_CALLBACK_URL,
                BASE_URL
            ),
        ],
    ],
])(
    "given multiple connections from %s",
    (message: string, connections: Connection[]) => {
        const uniqueBaseURLs = [
            ...new Set(connections.map((connection) => connection.baseURL)),
        ];
        const uniqueCallbackURLs = [
            ...new Set(
                connections.map((connections) => connections.callbackURL)
            ),
        ];

        describe("given no keyphrase occurrences stored", () => {
            let response: string[];

            beforeAll(async () => {
                jest.resetAllMocks();
                mockClientFactory.createClient.mockReturnValue(mockClient);
                mockRepository.getKeyphrases.mockResolvedValue([]);
                const domain = new NewConnectionDomain(
                    mockClientFactory,
                    mockRepository
                );

                response = await domain.provideCurrentKeyphrases(connections);
            });

            test("calls repository to obtain current keyphrase state for each base URL", () => {
                expect(mockRepository.getKeyphrases).toHaveBeenCalledTimes(
                    uniqueBaseURLs.length
                );
                expect(mockRepository.getKeyphrases.mock.calls.flat()).toEqual(
                    expect.arrayContaining(uniqueBaseURLs)
                );
            });

            test("does not create a client to handle the connections", () => {
                expect(mockClientFactory.createClient).not.toHaveBeenCalled();
            });

            test("does not call any existing client references", () => {
                expect(mockClient.sendData).not.toHaveBeenCalled();
            });

            test("returns no failure IDs", () => {
                expect(response).toEqual([]);
            });
        });

        describe.each([
            [
                "a single keyphrase occurrence stored",
                createOccurrences(BASE_URL, 1),
            ],
            [
                "multiple keyphrase occurrences stored",
                createOccurrences(BASE_URL, 3),
            ],
        ])(
            "given %s",
            (message: string, expectedOccurrences: PathnameOccurrences[]) => {
                let response: string[];
                let mockSendData: jest.Mock;

                beforeAll(async () => {
                    jest.resetAllMocks();
                    mockClientFactory.createClient.mockReturnValue(mockClient);
                    mockRepository.getKeyphrases.mockResolvedValue(
                        expectedOccurrences
                    );
                    mockSendData = On(mockClient).get(
                        method((mock) => mock.sendData)
                    );
                    mockSendData.mockResolvedValue(true);
                    const domain = new NewConnectionDomain(
                        mockClientFactory,
                        mockRepository
                    );

                    response = await domain.provideCurrentKeyphrases(
                        connections
                    );
                });

                test("calls repository to obtain current keyphrase state for each base URL", () => {
                    expect(mockRepository.getKeyphrases).toHaveBeenCalledTimes(
                        uniqueBaseURLs.length
                    );
                    expect(
                        mockRepository.getKeyphrases.mock.calls.flat()
                    ).toEqual(expect.arrayContaining(uniqueBaseURLs));
                });

                test("calls the web socket client factory to create a client to each unique callback URL", () => {
                    expect(
                        mockClientFactory.createClient
                    ).toHaveBeenCalledTimes(uniqueCallbackURLs.length);
                    expect(
                        mockClientFactory.createClient.mock.calls.flat()
                    ).toEqual(expect.arrayContaining(uniqueCallbackURLs));
                });

                test("calls web socket client with returned keyphrase occurrences for each connection", () => {
                    const expectedCalls = connections.map((connection) => {
                        return [
                            JSON.stringify(expectedOccurrences),
                            connection.connectionID,
                        ];
                    });

                    expect(mockClient.sendData).toHaveBeenCalledTimes(
                        connections.length
                    );
                    for (const call of expectedCalls) {
                        expect(mockSendData.mock.calls).toContainEqual(call);
                    }
                });

                test("returns no failure IDs", () => {
                    expect(response).toEqual([]);
                });
            }
        );

        describe("given an error occurs while obtaining the keyphrase occurrences", () => {
            let response: string[];

            beforeAll(async () => {
                jest.resetAllMocks();
                mockClientFactory.createClient.mockReturnValue(mockClient);
                mockRepository.getKeyphrases.mockRejectedValue(new Error());
                const domain = new NewConnectionDomain(
                    mockClientFactory,
                    mockRepository
                );

                response = await domain.provideCurrentKeyphrases(connections);
            });

            test("does not create a client to handle the connections", () => {
                expect(mockClientFactory.createClient).not.toHaveBeenCalled();
            });

            test("does not call any existing client references to handle the connections", () => {
                expect(mockClient.sendData).not.toHaveBeenCalled();
            });

            test("returns all provided connection IDs as failures", () => {
                expect(response.length).toEqual(connections.length);
                for (const connection of connections) {
                    expect(response).toContainEqual(connection.connectionID);
                }
            });
        });

        describe("given an error occurs during the creation of a web socket client", () => {
            let response: string[];

            beforeAll(async () => {
                jest.resetAllMocks();
                mockClientFactory.createClient.mockImplementation(() => {
                    throw new Error();
                });
                mockRepository.getKeyphrases.mockResolvedValue(
                    createOccurrences(BASE_URL, 1)
                );
                const domain = new NewConnectionDomain(
                    mockClientFactory,
                    mockRepository
                );

                response = await domain.provideCurrentKeyphrases(connections);
            });

            test("does not call any existing client references to handle the connections", () => {
                expect(mockClient.sendData).not.toHaveBeenCalled();
            });

            test("returns all provided connection IDs as failures", () => {
                expect(response.length).toEqual(connections.length);
                for (const connection of connections) {
                    expect(response).toContainEqual(connection.connectionID);
                }
            });
        });

        test("returns all IDs if error occurs during the transmission of keyphrases state to all connections", async () => {
            jest.resetAllMocks();
            mockRepository.getKeyphrases.mockResolvedValue(
                createOccurrences(BASE_URL, 1)
            );
            mockClientFactory.createClient.mockReturnValue(mockClient);
            const mockSendData: jest.Mock = On(mockClient).get(
                method((mock) => mock.sendData)
            );
            mockSendData.mockRejectedValue(new Error());
            const domain = new NewConnectionDomain(
                mockClientFactory,
                mockRepository
            );

            const response = await domain.provideCurrentKeyphrases(connections);

            expect(response.length).toEqual(connections.length);
            for (const connection of connections) {
                expect(response).toContainEqual(connection.connectionID);
            }
        });

        test("returns all IDs if the client fails to send keyphrase state to all connections", async () => {
            jest.resetAllMocks();
            mockRepository.getKeyphrases.mockResolvedValue(
                createOccurrences(BASE_URL, 1)
            );
            mockClientFactory.createClient.mockReturnValue(mockClient);
            const mockSendData: jest.Mock = On(mockClient).get(
                method((mock) => mock.sendData)
            );
            mockSendData.mockResolvedValue(false);
            const domain = new NewConnectionDomain(
                mockClientFactory,
                mockRepository
            );

            const response = await domain.provideCurrentKeyphrases(connections);

            expect(response.length).toEqual(connections.length);
            for (const connection of connections) {
                expect(response).toContainEqual(connection.connectionID);
            }
        });

        test("returns first ID if the client only fails to send keyphrase for first connection", async () => {
            jest.resetAllMocks();
            mockRepository.getKeyphrases.mockResolvedValue(
                createOccurrences(BASE_URL, 1)
            );
            mockClientFactory.createClient.mockReturnValue(mockClient);
            const mockSendData: jest.Mock = On(mockClient).get(
                method((mock) => mock.sendData)
            );
            mockSendData.mockResolvedValue(true).mockResolvedValueOnce(false);
            const domain = new NewConnectionDomain(
                mockClientFactory,
                mockRepository
            );

            const response = await domain.provideCurrentKeyphrases(connections);

            expect(response.length).toEqual(1);
            expect(response[0]).toEqual(connections[0].connectionID);
        });
    }
);

describe("given duplicate connections", () => {
    const connections = [
        createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL),
        createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL),
    ];

    describe("given occurrences stored for base URL", () => {
        const expectedOccurrences = createOccurrences(BASE_URL, 1);

        let response: string[];
        let mockSendData: jest.Mock;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockClientFactory.createClient.mockReturnValue(mockClient);
            mockRepository.getKeyphrases.mockResolvedValue(expectedOccurrences);
            mockSendData = On(mockClient).get(method((mock) => mock.sendData));
            mockSendData.mockResolvedValue(true);
            const domain = new NewConnectionDomain(
                mockClientFactory,
                mockRepository
            );

            response = await domain.provideCurrentKeyphrases(connections);
        });

        test("calls repository once to obtain current keyphrase state", () => {
            expect(mockRepository.getKeyphrases).toHaveBeenCalledTimes(1);
            expect(mockRepository.getKeyphrases).toHaveBeenCalledWith(BASE_URL);
        });

        test("calls the web socket client factory to create a client once", () => {
            expect(mockClientFactory.createClient).toHaveBeenCalledTimes(1);
            expect(mockClientFactory.createClient).toHaveBeenCalledWith(
                CALLBACK_URL
            );
        });

        test("calls web socket client with returned keyphrase occurrences once", () => {
            expect(mockClient.sendData).toHaveBeenCalledTimes(1);
            expect(mockClient.sendData).toHaveBeenCalledWith(
                JSON.stringify(expectedOccurrences),
                CONNECTION_ID
            );
        });

        test("returns no failure IDs", () => {
            expect(response).toEqual([]);
        });
    });

    test("returns one failure ID if an error occurs during keyphrase occurrence retrieval", async () => {
        jest.resetAllMocks();
        mockClientFactory.createClient.mockReturnValue(mockClient);
        mockRepository.getKeyphrases.mockRejectedValue(new Error());
        const domain = new NewConnectionDomain(
            mockClientFactory,
            mockRepository
        );

        const response = await domain.provideCurrentKeyphrases(connections);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(CONNECTION_ID);
    });

    test("returns one failure ID if an error occurs during the creation of a web socket client", async () => {
        jest.resetAllMocks();
        mockClientFactory.createClient.mockImplementation(() => {
            throw new Error();
        });
        mockRepository.getKeyphrases.mockResolvedValue(
            createOccurrences(BASE_URL, 1)
        );
        const domain = new NewConnectionDomain(
            mockClientFactory,
            mockRepository
        );

        const response = await domain.provideCurrentKeyphrases(connections);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(CONNECTION_ID);
    });

    test("returns one failure ID if error occurs during the transmission of keyphrases state", async () => {
        jest.resetAllMocks();
        mockRepository.getKeyphrases.mockResolvedValue(
            createOccurrences(BASE_URL, 1)
        );
        mockClientFactory.createClient.mockReturnValue(mockClient);
        const mockSendData: jest.Mock = On(mockClient).get(
            method((mock) => mock.sendData)
        );
        mockSendData.mockRejectedValue(new Error());
        const domain = new NewConnectionDomain(
            mockClientFactory,
            mockRepository
        );

        const response = await domain.provideCurrentKeyphrases(connections);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(CONNECTION_ID);
    });

    test("returns one failure ID if the client fails to send keyphrase state", async () => {
        jest.resetAllMocks();
        mockRepository.getKeyphrases.mockResolvedValue(
            createOccurrences(BASE_URL, 1)
        );
        mockClientFactory.createClient.mockReturnValue(mockClient);
        const mockSendData: jest.Mock = On(mockClient).get(
            method((mock) => mock.sendData)
        );
        mockSendData.mockResolvedValue(false);
        const domain = new NewConnectionDomain(
            mockClientFactory,
            mockRepository
        );

        const response = await domain.provideCurrentKeyphrases(connections);

        expect(response).toHaveLength(1);
        expect(response[0]).toEqual(CONNECTION_ID);
    });
});
