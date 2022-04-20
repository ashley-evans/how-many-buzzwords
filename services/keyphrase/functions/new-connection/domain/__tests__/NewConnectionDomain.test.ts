import { mock } from "jest-mock-extended";
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
const mockClient = mock<WebSocketClient>();
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

    test("does not create a client to handle the request", () => {
        expect(mockClientFactory.createClient).not.toHaveBeenCalled();
    });

    test("does not call any existing client references to handle the request", () => {
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

        test("calls the web socket client factory to create a client to handle the request", () => {
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
