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
