/**
 * @group integration
 */

process.env.AWS_ACCESS_KEY_ID = "x";
process.env.AWS_SECRET_ACCESS_KEY = "x";
process.env.AWS_REGION = "eu-west-2";

import dynamoose from "dynamoose";

dynamoose.aws.ddb.local("http://localhost:8000");

import ActiveConnectionsRepository from "../ActiveConnectionsRepository";
import { Connection } from "../../ports/ActiveConnectionsRepositoryPort";

const TABLE_NAME = "active-connections-table";
const repository = new ActiveConnectionsRepository(TABLE_NAME, true);

const EXPECTED_CONNECTION: Connection = {
    connectionID: "test_id",
    callbackURL: new URL("https://www.test.com/"),
};
const OTHER_CONNECTION: Connection = {
    connectionID: "other_id",
    callbackURL: new URL("https://www.wibble.com/"),
};
const EXPECTED_BASE_URL = "www.example.com";
const OTHER_BASE_URL = "www.connection.com";

describe.each([
    ["no connections are", []],
    ["a single connection is", [EXPECTED_CONNECTION]],
    ["multiple connections are", [EXPECTED_CONNECTION, OTHER_CONNECTION]],
])(
    "GET: Given %s listening to the provided base URL",
    (message: string, expected: Connection[]) => {
        let response: Connection[];

        beforeAll(async () => {
            for (const connection of expected) {
                await repository.storeConnection(connection, EXPECTED_BASE_URL);
            }

            response = await repository.getListeningConnections(
                EXPECTED_BASE_URL
            );
        });

        test("returns the listening connections", () => {
            expect(response).toHaveLength(expected.length);
            expect(response).toEqual(expect.arrayContaining(expected));
        });

        afterAll(async () => {
            for (const connection of expected) {
                await repository.deleteConnection(connection.connectionID);
            }
        });
    }
);

describe("PUT: Stores the new active connection details", () => {
    let response: boolean;

    beforeAll(async () => {
        response = await repository.storeConnection(
            EXPECTED_CONNECTION,
            EXPECTED_BASE_URL
        );
    });

    test("stores a connection listening to the provided base URL successfully", async () => {
        const connections = await repository.getListeningConnections(
            EXPECTED_BASE_URL
        );

        expect(connections).toHaveLength(1);
        expect(connections[0]).toEqual(EXPECTED_CONNECTION);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteConnection(EXPECTED_CONNECTION.connectionID);
    });
});

describe("PUT: Overwrites existing active connection details given new base URL", () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storeConnection(EXPECTED_CONNECTION, OTHER_BASE_URL);

        response = await repository.storeConnection(
            EXPECTED_CONNECTION,
            EXPECTED_BASE_URL
        );
    });

    test("overwrites the old base URL entry", async () => {
        const connections = await repository.getListeningConnections(
            OTHER_BASE_URL
        );

        expect(connections).toHaveLength(0);
    });

    test("stores the new connection information against the new base URL", async () => {
        const connections = await repository.getListeningConnections(
            EXPECTED_BASE_URL
        );

        expect(connections).toHaveLength(1);
        expect(connections[0]).toEqual(EXPECTED_CONNECTION);
    });

    test("returns success", () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deleteConnection(EXPECTED_CONNECTION.connectionID);
    });
});

describe("DELETE: Given connection ID stored in DB", () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storeConnection(
            EXPECTED_CONNECTION,
            EXPECTED_BASE_URL
        );

        response = await repository.deleteConnection(
            EXPECTED_CONNECTION.connectionID
        );
    });

    test("deletion removes connection from DB", async () => {
        const connections = await repository.getListeningConnections(
            EXPECTED_BASE_URL
        );

        expect(connections).toHaveLength(0);
    });

    test("deletion returns success", () => {
        expect(response).toEqual(true);
    });
});
