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

const domain = new NewConnectionDomain(mockClientFactory, mockRepository);

const CONNECTION_ID = "test_connection_id";
const CALLBACK_URL = new URL("https://www.callback.com/");
const BASE_URL = "www.example.com";

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

describe("given a single new connection listening to a baseURL that has no keyphrases", () => {
    const connection = createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL);

    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockClientFactory.createClient.mockReturnValue(mockClient);
        mockRepository.getKeyphrases.mockResolvedValue([]);

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

    test("does not call any existing client references to handle the single connection", () => {
        expect(mockClient.sendData).not.toHaveBeenCalled();
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });
});

describe.each([
    ["a single keyphrase occurrence stored", createOccurrences(BASE_URL, 1)],
    ["multiple keyphrase occurrences stored", createOccurrences(BASE_URL, 3)],
])(
    "given a single new connection listening to a baseURL that has %s",
    (message: string, expectedOccurrences: PathnameOccurrences[]) => {
        const connection = createConnection(
            CONNECTION_ID,
            CALLBACK_URL,
            BASE_URL
        );

        let response: boolean;

        beforeAll(async () => {
            jest.resetAllMocks();
            const mockSendData: jest.Mock = On(mockClient).get(
                method((mock) => mock.sendData)
            );
            mockSendData.mockResolvedValue(true);
            mockClientFactory.createClient.mockReturnValue(mockClient);
            mockRepository.getKeyphrases.mockResolvedValue(expectedOccurrences);

            response = await domain.provideCurrentKeyphrases(connection);
        });

        test("calls repository to obtain current keyphrase state for base URL", () => {
            expect(mockRepository.getKeyphrases).toHaveBeenCalledTimes(1);
            expect(mockRepository.getKeyphrases).toHaveBeenCalledWith(
                connection.baseURL
            );
        });

        test("calls the web socket client factory to create a client to handle the single connection", () => {
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

describe("given an error occurs while obtaining the keyphrase occurrences for a single connection", () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockClientFactory.createClient.mockReturnValue(mockClient);
        mockRepository.getKeyphrases.mockRejectedValue(new Error());

        response = await domain.provideCurrentKeyphrases(
            createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL)
        );
    });

    test("does not create a client to handle the connections", () => {
        expect(mockClientFactory.createClient).not.toHaveBeenCalled();
    });

    test("does not call any existing client references to handle the single connection", () => {
        expect(mockClient.sendData).not.toHaveBeenCalled();
    });

    test("returns failure", () => {
        expect(response).toEqual(false);
    });
});

describe("given an error occurs during the creation of a web socket client to deal with a single connection", () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockClientFactory.createClient.mockImplementation(() => {
            throw new Error();
        });
        mockRepository.getKeyphrases.mockResolvedValue(
            createOccurrences(BASE_URL, 1)
        );

        response = await domain.provideCurrentKeyphrases(
            createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL)
        );
    });

    test("does not call any existing client references to handle the single connection", () => {
        expect(mockClient.sendData).not.toHaveBeenCalled();
    });

    test("returns failure", () => {
        expect(response).toEqual(false);
    });
});

test("returns failure if error occurs during the transmission of keyphrases state to a single connection", async () => {
    jest.resetAllMocks();
    mockRepository.getKeyphrases.mockResolvedValue(
        createOccurrences(BASE_URL, 1)
    );
    mockClientFactory.createClient.mockReturnValue(mockClient);
    const mockSendData: jest.Mock = On(mockClient).get(
        method((mock) => mock.sendData)
    );
    mockSendData.mockRejectedValue(new Error());

    const response = await domain.provideCurrentKeyphrases(
        createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL)
    );

    expect(response).toEqual(false);
});

test("returns failure if the client fails to send keyphrase state to a single connection", async () => {
    jest.resetAllMocks();
    mockRepository.getKeyphrases.mockResolvedValue(
        createOccurrences(BASE_URL, 1)
    );
    mockClientFactory.createClient.mockReturnValue(mockClient);
    const mockSendData: jest.Mock = On(mockClient).get(
        method((mock) => mock.sendData)
    );
    mockSendData.mockResolvedValue(false);

    const response = await domain.provideCurrentKeyphrases(
        createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL)
    );

    expect(response).toEqual(false);
});

describe("given multiple connections from the same callback address listening to the same base URL thas has no keyphrase occurrences stored", () => {
    const connections = [
        createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL),
        createConnection("test_connection_id_2", CALLBACK_URL, BASE_URL),
    ];

    let response: string[];

    beforeAll(async () => {
        jest.resetAllMocks();
        mockClientFactory.createClient.mockReturnValue(mockClient);
        mockRepository.getKeyphrases.mockResolvedValue([]);

        response = await domain.provideCurrentKeyphrases(connections);
    });

    test("calls repository to obtain current keyphrase state for base URL", () => {
        expect(mockRepository.getKeyphrases).toHaveBeenCalledTimes(1);
        expect(mockRepository.getKeyphrases).toHaveBeenCalledWith(BASE_URL);
    });

    test("does not create a client to handle the connections", () => {
        expect(mockClientFactory.createClient).not.toHaveBeenCalled();
    });

    test("does not call any existing client references to handle the single connection", () => {
        expect(mockClient.sendData).not.toHaveBeenCalled();
    });

    test("returns no failure IDs", () => {
        expect(response).toEqual([]);
    });
});

describe.each([
    ["a single keyphrase occurrence stored", createOccurrences(BASE_URL, 1)],
    ["multiple keyphrase occurrences stored", createOccurrences(BASE_URL, 3)],
])(
    "given multiple connections from the same callback address listening to the same base URL with %s",
    (message: string, expectedOccurrences: PathnameOccurrences[]) => {
        const connections = [
            createConnection(CONNECTION_ID, CALLBACK_URL, BASE_URL),
            createConnection("test_connection_id_2", CALLBACK_URL, BASE_URL),
        ];

        let response: string[];

        beforeAll(async () => {
            jest.resetAllMocks();
            mockClientFactory.createClient.mockReturnValue(mockClient);
            mockRepository.getKeyphrases.mockResolvedValue(expectedOccurrences);

            response = await domain.provideCurrentKeyphrases(connections);
        });

        test("calls repository to obtain current keyphrase state for base URL", () => {
            expect(mockRepository.getKeyphrases).toHaveBeenCalledTimes(1);
            expect(mockRepository.getKeyphrases).toHaveBeenCalledWith(BASE_URL);
        });

        test("calls the web socket client factory to create a client to handle all connections", () => {
            expect(mockClientFactory.createClient).toHaveBeenCalledTimes(1);
            expect(mockClientFactory.createClient).toHaveBeenCalledWith(
                CALLBACK_URL
            );
        });

        test("calls web socket client with returned keyphrase occurrences for each ", () => {
            const expectedConnectionIDs = connections.map(
                (connection) => connection.connectionID
            );

            expect(mockClient.sendData).toHaveBeenCalledTimes(1);
            expect(mockClient.sendData).toHaveBeenCalledWith(
                JSON.stringify(expectedOccurrences),
                expectedConnectionIDs
            );
        });

        test("returns no failure IDs", () => {
            expect(response).toEqual([]);
        });
    }
);
