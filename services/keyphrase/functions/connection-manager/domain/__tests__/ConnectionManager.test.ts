import { mock } from "jest-mock-extended";
import {
    ActiveConnectionsRepositoryPort,
    Connection,
} from "buzzword-aws-active-connections-repository-library";

import ConnectionManager from "../ConnectionManager";

const mockRepository = mock<ActiveConnectionsRepositoryPort>();
const manager = new ConnectionManager(mockRepository);

const CONNECTION_ID = "test_connection_id";
const CALLBACK_URL = new URL("https://www.callback.com/");
const BASE_URL = new URL("https://www.example.com/");

describe("given a new connection", () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockRepository.storeConnection.mockResolvedValue(true);

        response = await manager.storeConnection(
            CONNECTION_ID,
            CALLBACK_URL,
            BASE_URL
        );
    });

    test("calls the repository once to store the connection information", () => {
        expect(mockRepository.storeConnection).toHaveBeenCalledTimes(1);
    });

    test("provides the connection details to the repository", () => {
        const expectedConnection: Connection = {
            connectionID: CONNECTION_ID,
            callbackURL: CALLBACK_URL,
        };
        expect(mockRepository.storeConnection).toHaveBeenCalledWith(
            expectedConnection,
            BASE_URL.hostname
        );
    });

    test("returns success given connection storage succeeded", () => {
        expect(response).toEqual(true);
    });
});

test("returns failure given the storage of a new connection fails", async () => {
    jest.resetAllMocks();
    mockRepository.storeConnection.mockResolvedValue(false);

    const response = await manager.storeConnection(
        CONNECTION_ID,
        CALLBACK_URL,
        BASE_URL
    );

    expect(response).toEqual(false);
});

test("returns failure if an exception occurs during new connection storage", async () => {
    jest.resetAllMocks();
    mockRepository.storeConnection.mockRejectedValue(new Error());

    const response = await manager.storeConnection(
        CONNECTION_ID,
        CALLBACK_URL,
        BASE_URL
    );

    expect(response).toEqual(false);
});

describe("given a connection deletion request", () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockRepository.deleteConnection.mockResolvedValue(true);

        response = await manager.deleteConnection(CONNECTION_ID);
    });

    test("calls the repository once to delete the connection information", () => {
        expect(mockRepository.deleteConnection).toHaveBeenCalledTimes(1);
    });

    test("provides the connection ID to the repository", () => {
        expect(mockRepository.deleteConnection).toHaveBeenCalledWith(
            CONNECTION_ID
        );
    });

    test("returns success given connection deletion succeeded", () => {
        expect(response).toEqual(true);
    });
});

test("returns failure given the deletion of a connection fails", async () => {
    jest.resetAllMocks();
    mockRepository.deleteConnection.mockResolvedValue(false);

    const response = await manager.deleteConnection(CONNECTION_ID);

    expect(response).toEqual(false);
});

test("returns failure if an exception occurs during connection deletion", async () => {
    jest.resetAllMocks();
    mockRepository.deleteConnection.mockRejectedValue(new Error());

    const response = await manager.deleteConnection(CONNECTION_ID);

    expect(response).toEqual(false);
});
